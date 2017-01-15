/* 日本語表示用（暫定版） 2017.01.15 by T.Kawasaki */

// 一覧表示
Fiver.makeListItemtHtml = function(itemData) {
    var html = '<a class="m-list__item" href="#" data-af-item-id="[[ID]]" data-af-item-locatioin="[[LOCATION]]"><div class="__item-head"><h2>[[NAME]]</h2><span class="__category">[[CATEGORY]]</span></div><div class="__item-body"><div class="__thumb"><div class="__thumb-image" style="background-image:url([[LOGO]])"></div></div><div class="__summary"><div><h3>所要時間</h3><div>[[DURATION]] 時間</div></div><div><h3>距離</h3><div>[[DISTANCE]] km</div></div>[[STAY_HTML]][[PRICE_HTML]]</div></div></a>';
    html = html.replace('[[CATEGORY]]', itemData.category);
    html = html.replace('[[ID]]',       itemData.id);
    html = html.replace('[[NAME]]',     itemData.name);
    html = html.replace('[[LOGO]]',     itemData.imageURL);
    html = html.replace('[[DURATION]]', itemData.duration);
    html = html.replace('[[DISTANCE]]', itemData.distance);

    // 平均滞在時間
    var stayHtml = '<div><h3>平均滞在時間</h3><div>[[STAY]] 分</div></div>';
    if (itemData.stay_time) {
        stayHtml = stayHtml.replace('[[STAY]]', itemData.stay_time);
    } else {
        stayHtml = '';
    }
    html = html.replace('[[STAY_HTML]]',  stayHtml);

    // 平均予算
    var priceHtml = '<div><h3>平均予算</h3><div style="width:10em;">[[PRICE]]</div></div>';
    if (itemData.average_price) {
        priceHtml = priceHtml.replace('[[PRICE]]', itemData.average_price);
        priceHtml = priceHtml.replace('JPY', '円');
    } else {
        priceHtml = '';
    }
    html = html.replace('[[PRICE_HTML]]', priceHtml);

    html = html.replace('[[LOCATION]]', itemData.address);
    return html;
};

// スポット情報
Fiver.setHtmlSpotDescription = function() {
  var spotData = Fiver.retSelectedSpotData();
  var setView = function(tgt, value, suffix) {
    var str = suffix || '';
    if (value == 0 ||
        value == '') {
      tgt.parent().hide();
    } else {
      tgt.parent().show();
      tgt.html(value + str);
    }
  };

  $('#spot-image').html('<div class="__thumb"><div class="__thumb-image" style="background-image:url(' + spotData.imageURL + ');"></div></div>');
  $('#spot-title').html(spotData.name);
  $('#spot-plan').html(spotData.category);
  $('#spot-duration').html(spotData.duration + ' 時間');
  $('#spot-distance').html(spotData.distance + ' km');
  setView($('#spot-time'), spotData.stay_time, ' 分');
  setView($('#spot-average-price'), spotData.average_price.replace('JPY', '円'));
  $('#spot-comment-desc').html(spotData.comment);
  if (spotData.web) {
    $('#spot-web').show();
    $('#spot-web a').attr({'href': spotData.web}).text('・' + spotData.web);
  } else {
    $('#spot-web').hide();
  }

};