'use strict';

let fs = require('fs');

let route = require('koa-route');
let serve = require('koa-static');

let koa = require('koa');
let app = koa();

let request = require('koa-request');
let moment = require('moment');

let view_index_template = fs.readFileSync('./views/index.html.template', 'utf8');

var view_index_rendered;
var view_index_rendered_cachedate;

app.use(route.get('/', view_index));
app.use(serve('./static'));

app.listen(process.env.PORT || 3000);

function *view_index() {
  let server_date = moment();
  //let server_date = moment([2015, 10 - 1, 23]);

  if (!view_index_rendered || server_date.format('YYYY-MM-DD') !== view_index_rendered_cachedate) {
    let days_left = yield dagar_kvar(server_date.year(), server_date.month() + 1, server_date.date());

    if (days_left.error) {
      return this.throw(days_left.error);
    }

    view_index_rendered = view_index_template.replace('{{days}}', days_left.days_left);
    view_index_rendered_cachedate = server_date.format('YYYY-MM-DD');
  }

  this.body = view_index_rendered;
}

function *dagar_kvar(year, month, day) {
  try {
    let pay_date_arr = yield get_closest_pay_date_from(year, month, day);

    let pay_date = moment(pay_date_arr).startOf('day');
    let today = moment([year, month - 1, day]).startOf('day');
    
    if (!today.isValid() || !pay_date.isValid()) {
      return { error: 400 };
    }

    let days_until_pay = -today.diff(pay_date, 'days');

    return {
      days_left: days_until_pay,
      pay_date: pay_date.format('YYYY-MM-DD'),
      today_date: today.format('YYYY-MM-DD')
    };
  } catch (error) {
     return { error: 503 };
  }
}

function *get_closest_pay_date_from(year, month, day) {
  var pay_day = yield get_pay_day_of_month(year, month);

  if (pay_day > 0 && pay_day <= day) {
    ++month;

    if (month > 12) {
        ++year
        month = 1;
    }

    pay_day = yield get_pay_day_of_month(year, month);
  }

  if (pay_day <= 0) throw 'Could not find pay day';

  return [year, month - 1, pay_day]; // month 0..11
}

function *get_pay_day_of_month(year, month) {
  let response = yield request({
    url: 'http://api.dryg.net/dagar/v2.1/' + year + '/' + month,
    headers: { 'User-Agent': 'dagarkvartilllon-request' }
  });

  var dagar = JSON.parse(response.body);

  var pay_day_i = 24;
  var pay_day = dagar.dagar[pay_day_i];

  while (pay_day['arbetsfri dag'] === 'Ja' && pay_day_i >= 0) pay_day = dagar.dagar[--pay_day_i];

  return pay_day_i + 1;
}
