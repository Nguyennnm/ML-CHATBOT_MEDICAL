export const HealthController = {
  show(_req, res) {
    res.json({
      status: "ok",
      service: "medical-chatbot-api"
    });
  }
};
