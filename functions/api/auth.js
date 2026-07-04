export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    // Step 1: redirect to GitHub
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `https://paktax-gazette.pages.dev/api/auth`,
      scope: 'repo,user',
    });
    return Response.redirect(
      `https://github.com/login/oauth/authorize?${params}`, 302
    );
  }

  // Step 2: exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) {
    return new Response('Authentication failed', { status: 401 });
  }

  // Step 3: send token back to CMS
  const html = `<!DOCTYPE html>
<html>
<head><title>Authorizing...</title></head>
<body>
<script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:success:${JSON.stringify({ token: '${token}', provider: 'github' })}',
        e.origin
      );
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
<p>Authorizing... you can close this window.</p>
</body>
</html>`;

  return new Response(html.replace("'${token}'", `"${token}"`), {
    headers: { 'Content-Type': 'text/html' },
  });
}
