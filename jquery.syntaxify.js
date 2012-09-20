(function( $ ){
	var reservedWords = 
	['break','case','catch','continue','debugger','default','delete','do','else',
	'false','finally','for','function','if','in','instanceof','new','null','return',
	'switch','this','throw','true','try','typeof','var','void','while','with'];
	
	function wrapKeyword(keyword) { 
		return '<span class="js-r1">'+keyword+'</span>'; 
	}
	function wrapGlobal(global) { 
		return global.match(/^[A-Z]/)
			? '<span class="js-gl">'+global+'</span>'
			: '<span class="js-fn">'+global+'</span>';
	}
	function lineCommenter(comment) { 
		return '<span class="js-cm">'+$('<span>'+comment+'</span>').text()+'</span>'; 
	}
	function stringLiteral(literal) { 
		return '<span class="js-sl">'+$('<span>'+literal+'</span>').text()+'</span>'; 
	}
	$.fn.syntaxify = function(clickable) {
		this.each(function(i, element) {
			var src = $(element).html();
			var lines = src.split('\n');

			if (lines[0] === "") { lines.shift(); }
			// figure out the baseline for our indentation
			var numToTrim = Math.min.apply(this, lines.map(function(line) {
				if (line.match(/^\t+/)) {
					return line.match(/^\t+/)[0].length;
				} return 100; //this is an arbitrarily large number
			}));
			// process each line
			var fines = lines.map(function(line) {
				// trim off extra space according to our baseline
				var reg = new RegExp('^\t{'+numToTrim+'}');
				line = line.replace(reg,'').replace(/&/g,'&amp;');//.replace(/</g,'&lt;').replace(/>/g,'&gt;');
				var words = line.split(/\b/);
				for (var i in words) {
					if ($.inArray(words[i], reservedWords) > -1) { 
						line = line.replace(words[i], wrapKeyword, 'g'); 
					} else if (words[i] in window) {
						if (words[i-1] !== "." && words[i-1] !== "$") {
							line = line.replace(words[i], wrapGlobal, 'g');
						}
					}
				}
				
				reg = new RegExp('//.*');
				line = line.replace(reg,lineCommenter);
				
				var strings = line.match(/'([^'\\]|\\.)*'/g);
				for (var i in strings) {
					line = line.replace(strings[i],stringLiteral);
				}
				var re = $('<span/>').html(line.replace(/\t/gi, '&nbsp;&nbsp;&nbsp;&nbsp;')).html()+' <br/>\n';
				console.log(re);
				return re;
			});
			$(element).html(fines);
			var $parent = $(element).parent();
			// $parent.before(element)
			if (clickable) {
				$parent.dblclick(function(e) {
					var $ta = $('<textarea wrap="off"></textarea>').text($(element).text());
					$parent.append($ta);
					$ta.focus();
					$ta.one('blur',function() {
						$ta.remove();
					});
				});
			}
		});
	};
	$(document).ready(function() {
		$('code[syntaxify=true]').syntaxify();
	});
})( jQuery );