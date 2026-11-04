// The Worker's old address. Podcast apps follow 301s, so existing subscriptions keep working.
export default {
  fetch(request) {
    const url = new URL(request.url);
    if (!/^\/(feed|audio)\//.test(url.pathname)) return new Response('Moved to Ross Reads It.', { status: 410 });
    return Response.redirect(`https://rossreadsit.parasha.workers.dev${url.pathname}`, 301);
  },
};
