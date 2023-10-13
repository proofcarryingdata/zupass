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
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>Error</title>
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

        .toggleButton {
          cursor: pointer;
          border: none;
          color: rgba(0, 0, 0, 0.5);
          background: #fff;
          padding: 0.5rem 1rem;
          border-radius: 0.3rem;
          font-size: 1rem;
        }

        .contactButton {
          cursor: pointer;
          border: none;
          color: #fff;
          background: #2a3231;
          padding: 0.5rem 1rem;
          border-radius: 0.3rem;
          font-size: 1rem; 
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
        <span class="description">
        ${error ? error.message : ""}
        </span>
        <button class="contactButton">Message Zucat Support</button>
        <button class="toggleButton" onclick="toggleErrorStack()">Show Error Details (Advanced)</button>
        <span class="errorStack">
          ${error instanceof Error && error.stack}
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
