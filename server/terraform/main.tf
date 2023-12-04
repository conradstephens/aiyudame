variable "GOOGLE_CREDENTIALS" {
  type        = string
  sensitive   = true
  description = "Google Cloud service account credentials"
}

provider "google" {
  project     = "aiyudame"
  credentials = var.GOOGLE_CREDENTIALS
  region      = "us-central1"
}

resource "google_cloud_run_v2_service" "aiyudame-server-prod" {
  name     = "aiyudame-server-prod"
  location = "us-central1"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/aiyudame/server/prod@sha256:ff2a97693e2628b1bb5c07747679ae360b39de77cda40dd1461568688f3aaa8a"
    }

    service_account = "aiyudame-server@aiyudame.iam.gserviceaccount.com"

    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service" "aiyudame-server-dev" {
  name     = "aiyudame-server-dev"
  location = "us-central1"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/aiyudame/server/prod@sha256:ff2a97693e2628b1bb5c07747679ae360b39de77cda40dd1461568688f3aaa8a"
    }

    service_account = "aiyudame-server@aiyudame.iam.gserviceaccount.com"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_v2_service_iam_policy" "noauth-prod" {
  project  = google_cloud_run_v2_service.aiyudame-server-prod.project
  location = google_cloud_run_v2_service.aiyudame-server-prod.location
  name     = google_cloud_run_v2_service.aiyudame-server-prod.name

  policy_data = data.google_iam_policy.noauth.policy_data
}

resource "google_cloud_run_v2_service_iam_policy" "noauth-dev" {
  project  = google_cloud_run_v2_service.aiyudame-server-dev.project
  location = google_cloud_run_v2_service.aiyudame-server-dev.location
  name     = google_cloud_run_v2_service.aiyudame-server-dev.name

  policy_data = data.google_iam_policy.noauth.policy_data
}
