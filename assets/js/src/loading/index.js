var Loading = function(){
	this.init = init;
	this.show = show;
	this.hide = hide;
	this.loop = loop;

	this.$el = null;
};

function init () {

	Snap.plugin(function (Snap, Element, Paper, glob) {
		Paper.prototype.arc = function (cx, cy, r, start, end) {
			var arc = this.path();
			arc.attr('shapeType', 'arc');
			if (typeof cx == "object") {
				arc.attr(cx);
			} else {
				arc.attr({ cx: cx, cy: cy, r: r, start: start, end: end });
			}
			return arc;
		};

		var arcPath = "M{sx},{sy}A{r},{r} 0 0,{f} {mx},{my}A{r},{r} 0 0,{f} {ex},{ey}";
		var param = { cx: 0, cy: 0, r: 0, start: 0, end: 0 };

		function drawArc() {
			if (this.type != "path" || this.attr("shapeType") != "arc") {
				return;
			}
			var p = {};
			for (var i in param) {
				p[i] = parseInt(this.attr(i)) || 0;
			}
			if (p.end - p.start >= 360) {
				p.end = p.start + 360;
			} else if (p.end - p.start <= -360) {
				p.end = p.start - 360;
			}
			var srad = p.start * Math.PI / 180;
			var erad = p.end * Math.PI / 180;
			var mrad = (srad + erad) / 2;
			p.sx = p.r * Math.cos(srad) + p.cx;
			p.sy = p.r * Math.sin(srad) + p.cy;
			p.mx = p.r * Math.cos(mrad) + p.cx;
			p.my = p.r * Math.sin(mrad) + p.cy;
			p.ex = p.r * Math.cos(erad) + p.cx;
			p.ey = p.r * Math.sin(erad) + p.cy;
			p.f = srad < erad ? 1 : 0;
			this.attr("path", Snap.format(arcPath, p));
		}

		eve.on("snap.util.attr.cx", drawArc)(1);
		eve.on("snap.util.attr.cy", drawArc)(1);
		eve.on("snap.util.attr.r", drawArc)(1);
		eve.on("snap.util.attr.start", drawArc)(1);
		eve.on("snap.util.attr.end", drawArc)(1);
	});

	var $el = this.$el = $('.m-loading').find('.m-loading__loader-inner').eq(0);

	$.support.svg = (document.createElementNS && document.createElementNS("http://www.w3.org/2000/svg", "svg").viewBox);

	var draw = function (option) {
		var strokeColor = Snap.color(option.stroke);
		option.snap.arc(option.cx, option.cy, option.r, option.start, option.end)
		.attr({
			class: 'bg-arc',
			fill:"none",
			stroke: option.bgStroke,
			strokeWidth: option.strokeWidth
		});

		option.snap.arc(option.cx, option.cy, option.r, option.start, option.start)
		.attr({
			class: 'arc',
			fill:"none",
			stroke: option.stroke,
			strokeWidth: option.strokeWidth
		});
		return option.snap;
	};

	var $svgDom = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
	var $svg = $($svgDom).attr({
		'id': 'svgLoader'
		,'viewBox': ['0', '0', parseInt($el.width()), parseInt($el.height())].join(' ')
		,'width': parseInt($el.width())
		,'height': parseInt($el.height())
	});
	$el.append($svg);

	var s = Snap('#' + $svg.attr('id'));
	var color = '#ECB91E';
	var bgColor = '#F5F5F5';
	var strokeWidth = 5;

	s = draw({
		snap: s,
		cx: parseInt($el.width()) * 0.5,
		cy: parseInt($el.height()) * 0.5,
		r: parseInt($el.width() - strokeWidth) * 0.5,
		start: 0,
		end: 360,
		stroke: color,
		bgStroke: bgColor,
		strokeWidth: strokeWidth
	});
	$el.data('svg', s);

	this.loop();

};

function loop(){
	var _this = this;
	var arc = this.$el.data('svg').select('.arc');

	arc.stop().attr({ start: 0, end: 0 });
	arc.animate({ start: 0 + 120, end: 360 + 120 }, 1200, mina.easeInSine, function(){
		arc.animate({ start: 360 + 360, end : 360 + 360 }, 1200, mina.easeOutSine, function() {
			_this.loop();
		});
	});
}

function show(){

	this.loop();

	$('body').addClass('js-show-loading');
	$('html').on('touchmove.loading', function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
	});
}

function hide(){
	$('body').removeClass('js-show-loading');
	$('html').off('touchmove.loading');

	this.$el.data('svg').select('.arc').stop();
}

module.exports = new Loading();