export const htmlContent = `
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
