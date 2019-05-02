import { compose, Just, Maybe, Nothing, pipe, Task } from "elmish-core-ts";
import * as fs from "fs";
import * as Koa from "koa";
import * as route from "koa-route";
import * as serve from "koa-static";
import * as SvenskaDagar from "./SvenskaDagar";

const viewTemplate = fs.readFileSync("./views/index.html.template", "utf8");

const cache = new Map<string, string>();

const cacheKeyFromDate = (d: Date) =>
  d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();

const yearMonthFromDate = (date: Date): SvenskaDagar.YearMonth => [
  date.getFullYear(),
  date.getMonth() + 1
];

const nextMonth = (ymd: SvenskaDagar.YearMonth): SvenskaDagar.YearMonth => {
  const month = ymd[1] + 1;
  return month > 12 ? [ymd[0] + 1, 1] : [ymd[0], month];
};

const findPayday = (manad: SvenskaDagar.Manad) =>
  findPaydayHelp(manad.dagar, 25 - 1);

const findPaydayHelp = (
  dagar: SvenskaDagar.Manad["dagar"],
  index: number
): Maybe<SvenskaDagar.Dag> => {
  const dag = dagar[index];

  return dag === undefined
    ? Nothing
    : dag["arbetsfri dag"] === "Nej"
    ? Just(dag)
    : findPaydayHelp(dagar, index - 1);
};

const dateDiffInDays = (a: Date) => (b: Date) => {
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.floor((utc2 - utc1) / msPerDay);
};

const daysUntilPaydayByManad = (now: Date) => (manad: SvenskaDagar.Manad) =>
  pipe(
    manad,
    findPayday,
    Maybe.map(dag => dateDiffInDays(now)(new Date(dag.datum)))
  );

const daysUntilPaydayFrom = (now: Date) =>
  pipe(
    yearMonthFromDate(now),
    SvenskaDagar.manad,
    Task.map(
      compose(
        daysUntilPaydayByManad(now),
        Maybe.withDefault(-1)
      )
    ),
    Task.andThen(daysLeft =>
      daysLeft >= 0
        ? Task.succeed(Just(daysLeft))
        : pipe(
            yearMonthFromDate(now),
            nextMonth,
            SvenskaDagar.manad,
            Task.map(daysUntilPaydayByManad(now))
          )
    )
  );

const app = new Koa();

app.use(
  route.get("/", ctx =>
    pipe(
      Task.now(),
      Task.andThen(now => {
        const cacheKey = cacheKeyFromDate(now);
        const cachedView = Maybe.fromNullable(cache.get(cacheKey));

        return pipe(
          cachedView,
          Maybe.map(Task.succeed),
          Maybe.withDefault(
            pipe(
              daysUntilPaydayFrom(now),
              Task.map(daysLeft =>
                viewTemplate.replace(
                  "{{days}}",
                  pipe(
                    daysLeft,
                    Maybe.map(String),
                    Maybe.withDefault("?")
                  )
                )
              ),
              Task.map(view => {
                cache.clear();
                cache.set(cacheKey, view);
                return view;
              })
            )
          )
        );
      }),
      Task.attempt(result => {
        switch (result.tag) {
          case "Err":
            ctx.throw(500, result.error.message);
            return;
          case "Ok":
            ctx.body = result.value;
            return;
        }
      })
    )
  )
);

app.use(serve("./static"));

app.listen(process.env.PORT || 3000);
