// Reading a long list a page at a time, for the seasonal trees (see seasonal_fetch.js). No API calls here, so it can be
// tested on its own.

/**
 * A whole list read a page at a time: getPage(offset) gives { people, total }, and after the first page, three are
 * read at once. Anyone in two pages (the list changed while it was read) is kept once. onProgress(read, total).
 */
export async function readAllPages(getPage, pageSize, onProgress = () => {}) {
  const first = await getPage(0);
  const pages = [first.people];
  let read = first.people.length;
  onProgress(read, first.total);
  const offsets = [];
  if (first.people.length >= pageSize) {
    for (let offset = pageSize; offset < first.total; offset += pageSize) offsets.push(offset);
  }
  let next = 0;
  const reader = async () => {
    while (next < offsets.length) {
      const index = next++;
      const { people } = await getPage(offsets[index]);
      pages[index + 1] = people;
      read += people.length;
      onProgress(read, first.total);
    }
  };
  await Promise.all([reader(), reader(), reader()]);
  const byId = new Map();
  for (const person of pages.flat()) byId.set(String(person.Id), person);
  return [...byId.values()];
}
