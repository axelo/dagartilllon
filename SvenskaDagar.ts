import * as https from "https";
import { Task, pipe } from "elmish-core-ts";

export type Manad = {
  readonly startdatum: string;
  readonly slutdatum: string;
  readonly dagar: readonly (Dag | undefined)[];
};

export type Dag = {
  readonly "arbetsfri dag": string;
  readonly datum: string;
};

export type YearMonth = [number, number];

const options = (ym: YearMonth): https.RequestOptions => ({
  method: "GET",
  hostname: "api.dryg.net",
  port: 443,
  path: `/dagar/v2.1/${ym[0]}/${ym[1]}`,
  headers: {
    "User-Agent": "dagarkvartilllon-request"
  }
});

export const manad = (yearMonth: [number, number]) =>
  pipe(
    Task.fromPromise(
      () =>
        new Promise<Buffer>((resolve, reject) => {
          const req = https.request(options(yearMonth), res => {
            const chunks: any[] = [];

            res.on("error", reject);
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => {
              if (res.statusCode === 200) {
                resolve(Buffer.concat(chunks));
              } else {
                reject(Buffer.concat(chunks));
              }
            });
          });

          req.on("error", reject);
          req.end();
        }),
      Task.reasonToError
    ),
    Task.map(buffer => JSON.parse(buffer.toString("utf-8")) as Manad) // Unsafe, decode in future
  );
