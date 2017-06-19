function* itemByCount( item, count ) {
  for ( let i = 0; i < count; i++ ) {
    yield item;
  }
  yield null;
}

module.exports = {
  itemByCount : itemByCount
};
