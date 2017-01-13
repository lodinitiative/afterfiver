'use strict';

var tpl = require('./index.ejs');
var modal = $('body').append(tpl()).end().find('.m-modal').eq(0);

var Modal = function(selector){
	this.$content = $(selector, '.m-modal-contents').eq(0).clone();
	this.$container = $(modal).find('.m-modal__inner');
	this.$container.append(this.$content);
};

Modal.prototype.show = function(){
	var _this = this;

	$('body').addClass('js-show-modal');
	$('html').on('touchmove.modal', function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
	});
	modal.on('click.modal', function(e){
		_this.hide();
		e.stopPropagation();
	})
};

Modal.prototype.hide = function(){
	$('body').removeClass('js-show-modal');
	$('html').off('touchmove.modal');
	modal.off('click.modal');
};

module.exports = Modal;