'use strict';
onhash_change();

window.onhashchange = onhash_change;
window.ontouchstart = function (event) {
  var money_el = document.getElementById('money');

  if (document.activeElement === money_el) {
    if (event.target.id !== 'money') money_el.blur();
    else return true;
  }
  else money_el.focus();
  
  return false;
}

function money_from_hash() {
  var q = window.location.hash;
  if (!q) return '';

  var money_i = q.indexOf('money=');
  var money_end_i = q.indexOf('&', money_i);
  
  if (money_i < 0) return '';

  return parseInt(q.substring(money_i + 'money='.length, money_end_i < 0 ? q.length: money_end_i));
}

function onhash_change() {
  document.getElementById('money').value = read_money();
  onmoney_change(true);
}

function onmoney_change(skip_hash) {
  var money = parseInt(document.getElementById('money').value);
  var days = parseInt(document.getElementById('days').textContent);
  var money_per_day = Math.round(money/days);

  if (!skip_hash) {
    save_money(money);
  }

  document.getElementById('money_per_day').innerHTML = !money_per_day && money_per_day !== 0 ? '&nbsp;' : money_per_day;
  document.activeElement.blur();
}

function dismiss_on_retur(event) {
  if (event.keyCode === 13) document.activeElement.blur();
}

function save_money(m) {
  var clear_save = !m && m !== 0;

  if (navigator.standalone) {
    window.localStorage.money = clear_save ? '' : m;
  } else {
    window.location.hash = clear_save ? '' : ('#money=' + m);
  }
}

function read_money() {
  if (navigator.standalone) {
    return window.localStorage.money;
  }
  else {
    return money_from_hash();
  }
}