export const closeWebviewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sample HTML Page</title>
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #2a3231;
        }
      </style>
    </head>
    <body>
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
    <p>We were unable to verify that you have a ticket for a Telegram group</p>
    <p>
      Make sure that the event associated with your ticket has corresponding Telegram group in
      the list provided by the bot.
    </p>
    <p>Type <i>/start</i> again to view the list if needed.</p>
    <p>
      If you need help additional help, please email
      <b>passport@0xparc.org</b>.
    </p>
    ${
      error
        ? `
        <p>Here is the error we received:</p>
        <p>${error}</p>
        `
        : ""
    }
  </body>
</html>
`;
};
