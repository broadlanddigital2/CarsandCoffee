// Serves the static site from ./public and sends the bare domain to www,
// so search engines only see one version of every page.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "carsandcoffee.uk") {
      url.hostname = "www.carsandcoffee.uk";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
