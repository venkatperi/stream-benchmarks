function* itemByCount( item, count ) {
	// Using var instead of let for speed
  for ( var i = 0; i < count; i++ ) {
    yield item;
  }
  yield null;
}

function itemByCountIterator(item, count) {
	var i = 0;
	return {
		next: function() {
			return i++ < count ? 
				{ value: item, done: false} :
				{ value: null, done: true }
		}
	};
}

module.exports = {
  itemByCount : itemByCount,
  itemByCountIterator : itemByCountIterator
};