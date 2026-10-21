import { AwsRum, RRWebPlugin } from "aws-rum-web";
import "./style.css";

const rumConfig = window.RUM_CONFIG ?? {};
const hasRumConfig = Boolean(rumConfig.appMonitorId && rumConfig.identityPoolId);

if (hasRumConfig) {
  try {
    const applicationRegion = rumConfig.region || "us-east-1";
    /** @type {import("aws-rum-web").AwsRumConfig} */
    const config = {
      sessionSampleRate: 1,
      identityPoolId: rumConfig.identityPoolId,
      endpoint: `https://dataplane.rum.${applicationRegion}.amazonaws.com`,
      telemetries: ["performance", "errors", "http"],
      allowCookies: true,
      enableXRay: false,
      signing: true,
      releaseId: rumConfig.releaseId || undefined,
      eventPluginsToLoad: [new RRWebPlugin()]
    };

    new AwsRum(rumConfig.appMonitorId, "1.0.0", applicationRegion, config);
  } catch (error) {
    console.error("No se pudo inicializar CloudWatch RUM.", error);
  }
}

const status = document.querySelector("#event-status");

function reportEvent(message) {
  status.textContent = message;
}

document.querySelector("#trigger-js-error").addEventListener("click", () => {
  reportEvent("Error de JavaScript generado. Revisa CloudWatch RUM.");
  window.setTimeout(() => {
    throw new Error("Demo Northstar: error de JavaScript intencional");
  }, 0);
});

document.querySelector("#trigger-promise-error").addEventListener("click", () => {
  reportEvent("Rechazo de promesa generado. Revisa CloudWatch RUM.");
  Promise.reject(new Error("Demo Northstar: rechazo de promesa intencional"));
});

document.querySelector("#trigger-http-error").addEventListener("click", async () => {
  reportEvent("Solicitud HTTP 500 generada. Revisa CloudWatch RUM.");
  try {
    await fetch("/api/demo-failure");
  } catch (error) {
    console.error("Falló la solicitud de demostración.", error);
  }
});

document.querySelector("#rum-status").textContent = hasRumConfig
  ? `RUM conectado · ${rumConfig.region || "us-east-1"}`
  : "RUM sin configurar";
