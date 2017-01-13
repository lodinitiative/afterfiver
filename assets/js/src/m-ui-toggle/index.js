'use strict';

var $elem = $('.m-ui-toggle');

function Toggle(){
};

Toggle.prototype.init = function(){

	this.destroy();

	$elem.each(function(){
		var $this = $(this);
		var $input = $this.find('input');

		$input.on('change.toggle', function(){
			var $relatedSelect = $this.data('relatedSelect') ? $('select[name='+$this.data('relatedSelect')+']') : [];

			if( $input.val() !== "0" ){
				$this.addClass('_toggle-on');
			}else{
				$this.removeClass('_toggle-on');
			}

			if( $relatedSelect[0] ){
				if( $this.hasClass('_toggle-on') ){
					$relatedSelect.prop('disabled', true);
				}else{
					$relatedSelect.prop('disabled', false);
				}
			}

			$this.trigger('change.toggle', { value: $input.val() });
		});

		$this.on('click.toggle', function(){
			if( $this.hasClass('_toggle-on') ){
				$input.val("0");
			}else{
				$input.val("1");
			}
			$input.triggerHandler('change.toggle');
			return false;
		});

		$input.triggerHandler('change.toggle');
	});
};

Toggle.prototype.destroy = function(){

	$elem.each(function(){
		var $this = $(this);
		var $input = $this.find('input');

		$input.off('.toggle');
		$this.off('.toggle');
	});
	$elem.off('.toggle');
};

module.exports = new Toggle();