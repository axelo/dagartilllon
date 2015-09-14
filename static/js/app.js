(function () {
  'use strict';

  var use_localstorage = navigator.standalone ? true : false;

  var days_el = document.getElementById('days');
  var money_el = document.getElementById('money');
  var money_a_day_el = document.getElementById('money-a-day');

  function get_money_from_hash() {
    var hash = window.location.hash || '';
    var money_i = hash.indexOf('money=');
    
    if (money_i < 0) return undefined;

    var money_end_i = hash.indexOf('&', money_i);

    if (money_end_i < 0) money_end_i = hash.length;

    return parseInt(hash.substring(money_i + 'money='.length, money_end_i));
  }

  function money_changed() {
    var money = parseInt(load_money());
    var days = days_el.textContent;
    var money_per_day = Math.round(money / days);

    var a_day = (!money_per_day && money_per_day !== 0 ? '' : money_per_day) + '';

    if (a_day.length > 5) a_day = a_day.substring(0, 4) + '..';

    money_a_day_el.textContent = a_day;

    document.activeElement.blur();
  }

  function save_money(m) {
    var clear_save = !m && m !== 0;

    if (use_localstorage) window.localStorage.money = clear_save ? '' : m;
    else window.location.hash = clear_save ? '' : ('#money=' + m);
  }

  function load_money() {
    return use_localstorage
      ? window.localStorage.money
      : get_money_from_hash();
  }

  function update_money_el() {
    money_el.value = load_money();
  }

  money_el.onchange = function () {
    save_money(money_el.value);
    money_changed();
  };

  money_el.onkeydown = function dismiss_on_retur(event) {
    if (event.keyCode === 13) document.activeElement.blur();
  };

  window.onhashchange = function () {
    update_money_el();
    money_changed();
  };

  window.ontouchstart = function (event) {
    if (document.activeElement === money_el) {
      if (event.target.id !== 'money') money_el.blur();
      else return true;
    }
    else money_el.focus();
    
    return false;
  };

  update_money_el();
  money_changed();

}());