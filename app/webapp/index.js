sap.ui.define(
  ["sap/m/Shell", "sap/m/App", "sap/m/Page", "sap/m/MessageToast"],
  function (Shell, App, Page, MessageToast) {
    "use strict";

    // Create a simple Hello World page
    var oPage = new Page("helloPage", {
      title: "Employee Leave Management System - Step 2",
      content: [
        new sap.m.VBox({
          items: [
            new sap.m.Title({
              text: "🎉 UI5 is Working!",
              level: "H1",
            }),
            new sap.m.Text({
              text: "Backend Status: Connected to localhost:4004",
            }),
            new sap.m.Button({
              text: "Test Backend Connection",
              type: "Emphasized",
              press: function () {
                // Test if we can reach the backend
                fetch("/leave/")
                  .then((response) => response.json())
                  .then((data) => {
                    MessageToast.show("✅ Backend Connected Successfully!");
                    console.log("Backend response:", data);
                  })
                  .catch((error) => {
                    MessageToast.show("❌ Backend Connection Failed");
                    console.error("Backend error:", error);
                  });
              },
            }),
          ],
        }),
      ],
    });

    var oApp = new App({
      pages: [oPage],
    });

    var oShell = new Shell({
      app: oApp,
    });

    // Place the Shell in the HTML
    oShell.placeAt("content");
  }
);
