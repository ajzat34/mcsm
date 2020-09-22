function find(db, name) {
  return db.get('find').get(name).value();
}

async function add(db, alias, id) {
  if (find(db, alias)) throw new Error(`${alias} already exists`);
  await db.get('find').set(alias, id).write();
}

find.add = add;

module.exports = find;
