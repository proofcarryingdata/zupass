export const closeWebviewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sample HTML Page</title>
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
    </head>
    <body>
      <h1>Hello, World!</h1>
      <script>
        // Call the function when the page loads
        window.onload = Telegram.WebApp.close();
      </script>
    </body>
    </html>
  `;

export const errorHtmlWithDetails = (error: string): string => {
  return `<!DOCTYPE html>
  <html>
  <head>
    <title>Error</title>
    <style></style>
  </head>
  <body>
  <h3>Action failed</h3>
  ${
    error
      ? `
      <p>Here is the error we received:</p>
      <p><b>${error}</b></p>
      `
      : ""
  }
    <p>Type <i>/start</i> to try again.</p>
    <p>
      If you need help additional help, please email
      <b>passport@0xparc.org</b>.
    </p>

  </body>
</html>
`;
};
