var fs = require('fs');

var route = require('koa-route');
var serve = require('koa-static');

var koa = require('koa');
var app = koa();

var request = require('koa-request');
var moment = require('moment');

var view_index_template = fs.readFileSync('./views/index.html.template', 'utf8');
var view_index_rendered;
var view_index_rendered_cachedate;

app.use(route.get('/', view_index));
app.use(serve('./static'));

app.listen(process.env.PORT || 3000);

function *view_index() {
  var server_date = moment(); //moment([2015, 6, 20]);

  if (!view_index_rendered || server_date.format('YYYY-MM-DD') !== view_index_rendered_cachedate) {
    var days_left = yield dagar_kvar(server_date.year(), server_date.month() + 1, server_date.date());

    if (days_left.error) {
      return this.throw(days_left.error);
    }

    view_index_rendered = view_index_template.replace('{{days}}', days_left.days_left);
    view_index_rendered_cachedate = server_date.format('YYYY-MM-DD');
  }

  this.body = view_index_rendered;
}

function *dagar_kvar(year, month, day) {
  var response;

  try {
    var response = yield request({
      url: 'http://api.dryg.net/dagar/v2.1/' + year + '/' + month,
      headers: {
      'User-Agent': 'dagarkvartilllon-request'
      }
    });
  } catch (error) {
    return { error: 503 };
  }

  try {
    var today = moment([year, parseInt(month) - 1, day]).startOf('day');
    var dagar = JSON.parse(response.body);

    var pay_day_i = 24;
    var pay_day = dagar.dagar[pay_day_i];

    while (pay_day['arbetsfri dag'] === 'Ja' && pay_day_i >= 0) pay_day = dagar.dagar[--pay_day_i];

    if (pay_day_i < 0) return { error: 503 };

    var days_until_pay = -today.diff(pay_day.datum, 'days');

    return {
      days_left: days_until_pay,
      pay_date: pay_day.datum,
      today_date: today.format('YYYY-MM-DD')
    };
  } catch (error) {
     return { error: 400 };
  }
}


