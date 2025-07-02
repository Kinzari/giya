function getBaseURL() {
  return sessionStorage.getItem("baseURL");
}

// Configuration for GIYA project
window.CONFIG = {
  API_BASE_URL: 'http://localhost/api'
};

window.getBaseURL = getBaseURL;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getBaseURL };
}
