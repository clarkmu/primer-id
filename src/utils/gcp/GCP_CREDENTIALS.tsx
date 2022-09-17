const { GCP_BUCKET_PRIVATE_KEY } = process.env;

const GCP_CREDENTIALS: {
  bucket_name: string;
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
} = {
  bucket_name: "tcs-dr",
  type: "service_account",
  project_id: "phylodynamics-213415",
  private_key_id: "d16d90f31d1961d0f3b6c3cbab3f9e548ad0895d",
  private_key: GCP_BUCKET_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email:
    "tcs-dr-service-new@phylodynamics-213415.iam.gserviceaccount.com",
  client_id: "108250714575414510679",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/tcs-dr-service-new%40phylodynamics-213415.iam.gserviceaccount.com",
};

export default GCP_CREDENTIALS;
