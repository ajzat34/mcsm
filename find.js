/**
* find a server by alias name
* @param {lowdb} db
* @param {string} name
* @return {string} id
*/
function find(db, name, skip=true) {
  let result;
  if (name.startsWith('b:')) {
    result = db.get('backup_find').get(name).value();
  } else {
    result = db.get('find').get(name).value();
  }
  if (!result) {
    const err = new Error(`Server ${name} does not exist`);
    err.code = 'DNE';
    throw err;
  }
  return result;
}

/**
* add a search entry
* @param {lowdb} db
* @param {string} alias
* @param {string} id
*/
async function add(db, alias, id) {
  try {
    if (find(db, alias)) throw new Error(`${alias} already exists`);
  } catch (e) {}
  await db.get('find').set(alias, id).write();
}

/**
* add a backup search entry
* @param {lowdb} db
* @param {string} alias
* @param {string} id
*/
async function addbackup(db, alias, id) {
  if (!alias) throw new Error(`required alias value missing`);
  if (!id) throw new Error(`required id value missing`);
  try {
    if (find(db, `b:${alias}`)) throw new Error(`b:${alias} already exists`);
  } catch (e) {}
  await db.get('backup_find').set(`b:${alias}`, id).write();
}

find.add = add;
find.addbackup = addbackup;

module.exports = find;
