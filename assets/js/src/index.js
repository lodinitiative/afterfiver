'use strict';
var global = Function("return this")();
var menu = require('./m-menu');
var loading = require('./loading');
global.loading = require('./loading');
var Modal = require('./m-modal');
global.Modal = Modal;

$(function () {
	loading.init();
	menu.init();

	window.Fiver && Fiver.init();

	$('.js-location-textarea').each(fixTextareaHeight).on('change input', fixTextareaHeight);

	function fixTextareaHeight(){
		$(this).css({
			height: 0
		});
		$(this).css({
			height: this.scrollHeight
		})
	}

	$('.content-fiver--spot .__slide-content').slick({
		arrows: false,
		dots: true,
		appendDots: $('.__slide-indicator')
	});

	$('.content-capture--start .__keywords__clear').on('click', function () {
		var $container = $(this).closest('.content-head');
		$container.find('input[type=text]').val("");
		$container.find('.__ruby').text("");
		return false;
	});

	menu.cbChangeTab(function (name) {
		switch (name) {
			case 'content-fiver':
				Fiver.init();
				break;
			case 'content-capture':
				Caputure.init();
				break;
			case 'content-tv':
				Tv.init();
				break;
		}
	})

});
