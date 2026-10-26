/** Shared search-param contract for every file-listing route. */
export function validateBrowserSearch(search = {}) {
  return {
    q: search.q || undefined,
    folder: search.folder || undefined,
    category: search.category || undefined,
    sort: search.sort || undefined,
    view: search.view || undefined,
  };
}