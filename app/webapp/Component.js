sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Core",
  ],
  function (UIComponent, JSONModel, Core) {
    "use strict";

    return UIComponent.extend("com.company.leavemanagement.Component", {
      metadata: {
        manifest: "json",
      },

      init: function () {
        console.log("🚀 Component initialized successfully!");

        // Call parent init first
        UIComponent.prototype.init.apply(this, arguments);

        // Test backend connectivity
        this._testBackendConnection();

        // Initialize router with error handling
        this._initializeRouterSafely();
      },

      _initializeRouterSafely: function () {
        try {
          const oRouter = this.getRouter();

          // Wait for root view to be rendered
          this.getRootControl().attachAfterRendering(() => {
            console.log(
              "✅ Root view rendered, attempting router initialization"
            );

            // Small delay to ensure all controls are created
            setTimeout(() => {
              try {
                // Try to find the app control with various possible IDs
                const possibleIds = [
                  "app",
                  "appView--app",
                  this.getId() + "---appView--app",
                ];

                let appControl = null;
                for (const id of possibleIds) {
                  appControl = Core.byId(id);
                  if (appControl) {
                    console.log("✅ Found app control with ID:", id);
                    break;
                  }
                }

                if (appControl) {
                  // Update the router's target control reference
                  const oTargets = oRouter.getTargets();
                  const oTarget = oTargets.getTarget("home");
                  if (oTarget) {
                    // Force the correct control ID
                    oTarget._oOptions.controlId = appControl.getId();
                    console.log(
                      "✅ Updated target control ID to:",
                      appControl.getId()
                    );
                  }
                }

                oRouter.initialize();
                console.log("✅ Router initialized successfully");
              } catch (error) {
                console.error("❌ Router initialization failed:", error);
                console.log("⚠️ App will continue without routing");
              }
            }, 100);
          });
        } catch (error) {
          console.error("❌ Router setup failed:", error);
        }
      },

      _testBackendConnection: function () {
        const oModel = this.getModel();
        if (oModel) {
          console.log("🔗 Backend model connected");

          // Test data loading
          oModel
            .bindList("/Employees")
            .requestContexts(0, 5)
            .then((aContexts) => {
              console.log(
                `✅ Backend connected with ${aContexts.length} employee records`
              );
            })
            .catch((error) => {
              console.error("❌ Backend connection test failed:", error);
            });
        } else {
          console.error("❌ No model found");
        }
      },
    });
  }
);
