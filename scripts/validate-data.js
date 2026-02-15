const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDailies() {
  const dailies = readJson('src/data/dailies.json');
  assert(Array.isArray(dailies), 'dailies.json must be an array');

  const statuses = new Set(['available', 'sold', 'not_listed', 'published']);

  dailies.forEach((daily, index) => {
    assert(isObject(daily), `dailies[${index}] must be an object`);
    assert(typeof daily.id === 'string' && daily.id.length > 0, `dailies[${index}].id must be a non-empty string`);
    assert(typeof daily.imageUrl === 'string' && daily.imageUrl.length > 0, `dailies[${index}].imageUrl must be a non-empty string`);
    assert(typeof daily.savedDate === 'string' && !Number.isNaN(Date.parse(daily.savedDate)), `dailies[${index}].savedDate must be a valid date string`);
    assert(typeof daily.status === 'string' && statuses.has(daily.status), `dailies[${index}].status must be available|sold|not_listed|published`);
    if (daily.tags != null) {
      assert(Array.isArray(daily.tags) && daily.tags.every((t) => typeof t === 'string'), `dailies[${index}].tags must be a string[] when present`);
    }
    assert(daily.title == null || typeof daily.title === 'string', `dailies[${index}].title must be a string when present`);
    assert(daily.description == null || typeof daily.description === 'string', `dailies[${index}].description must be a string when present`);
    assert(daily.minted == null || typeof daily.minted === 'boolean', `dailies[${index}].minted must be boolean when present`);
    assert(daily.tokenId == null || typeof daily.tokenId === 'number', `dailies[${index}].tokenId must be number when present`);
    assert(daily.contractAddress == null || typeof daily.contractAddress === 'string', `dailies[${index}].contractAddress must be string when present`);
    assert(daily.owner == null || typeof daily.owner === 'string', `dailies[${index}].owner must be string when present`);
  });
}

function validateCollectionFile(relativePath) {
  const collection = readJson(relativePath);
  assert(isObject(collection), `${relativePath} must be an object`);
  assert(typeof collection.name === 'string', `${relativePath}.name must be a string`);
  assert(typeof collection.contractAddress === 'string', `${relativePath}.contractAddress must be a string`);
  assert(Array.isArray(collection.tokens), `${relativePath}.tokens must be an array`);

  collection.tokens.forEach((token, index) => {
    assert(isObject(token), `${relativePath}.tokens[${index}] must be an object`);
    assert(typeof token.tokenId === 'string' && token.tokenId.length > 0, `${relativePath}.tokens[${index}].tokenId must be a non-empty string`);
    assert(token.imageUrl == null || typeof token.imageUrl === 'string', `${relativePath}.tokens[${index}].imageUrl must be string|null`);
    assert(Array.isArray(token.attributes), `${relativePath}.tokens[${index}].attributes must be an array`);
  });
}

function validate() {
  validateDailies();
  validateCollectionFile('src/data/winions.json');
  validateCollectionFile('src/data/collection.json');
  console.log('Data validation passed');
}

try {
  validate();
} catch (error) {
  console.error(`Data validation failed: ${error.message}`);
  process.exit(1);
}
