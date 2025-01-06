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

export const errorHtmlWithDetails = (error: Error): string => {
  // Reformat linebreaks in error messages as <br>.  Also replace any <> to
  // avoid including of HTML (accidental, or XSS risks).
  const errorMessage = error
    ? error.message
        .replace(/\n/g, "<br>")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    : "";
  const errorStack =
    error instanceof Error && error.stack
      ? error.stack.replace(/\n/g, "<br>")
      : "";
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>Error</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
      <style>
        body {
          background-color: white;
          font-family: -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif;
        }
        .container {
          margin: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .header {
          color: #2a3231;
          font-size: 1.2rem;
          font-weight: 500;
        }
        .description {
          color: #585b6b;
        }

        .button {
          border: none;
          cursor: pointer;
          padding: 1rem;
          border-radius: 0.3rem;
          font-size: 1rem;
          transition: all 0.2s ease-in-out; 
        }

        .toggleButton {
          border: 1px solid rgba(0,0,0,0.1);
          color: rgba(0, 0, 0, 0.5);
          background: #fff;
        }

        .toggleButton:hover {
          background: rgba(0,0,0,0.05);
        }

        .contactButton {
          color: #fff;
          background: #2a3231;
        }

        .errorStack {
          display: none;
          color: #de6c5f;
          word-wrap: break-word;
        }

        .errorStack.show {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="header">${error.name}</span>
        <span class="description" style="margin-bottom:1rem;">
          ${errorMessage}
        </span>
        <div onclick="toggleErrorStack()" class="button toggleButton" style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:1rem;border:none;background:none;color:rgba(0,0,0,0.5);">Show Error Details (Advanced)</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H11L7.5 10.5L4 6Z" fill="currentColor"></path></svg>
        </div>
        <span class="errorStack">
          ${errorStack}
        </span>
      </div>
      <script>
      function toggleErrorStack() {
        const errorStack = document.querySelector('.errorStack');
        if (errorStack) {
          errorStack.classList.toggle('show');
        }
      }
    </script>
  </body>
</html>
`;
};
