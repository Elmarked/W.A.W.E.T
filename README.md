# W.A.W.E.T v1.1
Wallpapers Aren't Wasting Engineers Time 

Hey does changing the wallpaper and lockscreen in Windows 11 sounds like something you would like to do?

Yeha, me neither.  But say some galaxy brain in marketing makes it a thing this is the ultimate solution.

It's massively overkill, but it makes sure you don;t have to lift a finger if marketing want to change wallpapers every day.  In fact they don;t even need to tell you, they can just do it.


W.A.W.E.T is a secure wallpaper upload and validation service designed for enterprise environments.

It ensures:
--Only approved resolutions are accepted
--JPEG and PNG files accepted, JPEG converted to PNG client side
--Files are integrity-verified via SHA-256 hashing
--Uploads are authenticated using Microsoft Entra ID
--Storage access uses Azure Managed Identity (no secrets)
--All activity is logged for audit and forensic purposes
--This project demonstrates secure-by-design implementation aligned with modern Azure security architecture.


<img width="646" height="650" alt="image" src="https://github.com/user-attachments/assets/ef459e54-f25e-4ec3-9393-06e8faf9fea8" />


**High Level Architecture Flow**

User
  ↓
HTTPS (TLS 1.2+)
  ↓
Azure App Service (Node.js)
  ↓
JWT Validation (Microsoft Entra ID)
  ↓
File Validation (Type + Resolution)
  ↓
SHA-256 Hash Generation
  ↓
Azure Blob Storage (RBAC via Managed Identity)
  ↓
Application Insights (Audit Logging)


**Required Services**

Azure App Service — Hosts Node.js application (Linux, HTTPS enforced)

Azure Blob Storage — Stores validated wallpaper

Microsoft Entra ID — Issues JWT tokens for authentication

Azure Application Insights — Structured audit logging

Azure Log Analytics — Log retention and query



**Security Properties**

| Property        | Implementation                     |
| --------------- | ---------------------------------- |
| Authentication  | JWT validation against Entra ID    |
| Authorization   | Azure RBAC (Blob Data Contributor) |
| Confidentiality | HTTPS enforced                     |
| Integrity       | SHA-256 hash logged                |
| Auditability    | Application Insights events        |
| Non-repudiation | Hash + user Object ID logged       |


**Deployment**

Deployment can be done using azuredeployment.json

az deployment group create \
  --resource-group rg-wallpaper-prod \
  --template-file azuredeploy.json \
  --parameters tenantId=<tenant-id> clientId=<app-registration-client-id>

JWT Validation also requires creation of an Azure app using these steps or with graph:

1. Create an App Registration in Microsoft Entra ID

2. Configure:

   --Access token version: 2

   --Expose API (if required)

Note:

Application (Client) ID

Tenant ID

These values must match:

audience: process.env.CLIENT_ID
issuer: https://login.microsoftonline.com/${TENANT_ID}/v2.0


**Runtime Environment Variables**

Set the following in Azure App Service:

STORAGE_ACCOUNT
CONTAINER_NAME
APPINSIGHTS_CONNECTION_STRING
TENANT_ID
CLIENT_ID
EMAIL_HOST
EMAIL_USER
EMAIL_PASS



**Upload Endpoint**
POST /upload

**Headers**

Authorization: Bearer <JWT>
Content-Type: multipart/form-data

**Body**

wallpaper (PNG file)
emailConfirm (optional)
email (optional)

**Accepted Resolutions**

1920x1080
2560x1440
3840x2160
1366x768
1600x900

**Successful Response**

{
  "success": true,
  "hash": "64-character-sha256-hash"
}


**Integrity Model**

The uploaded file:

-Is stored in memory
-Is parsed using sharp
-Is hashed using SHA-256 on raw binary
-Is uploaded using Managed Identity
-Hash is logged alongside user Object ID

This enables:

-Tamper detection
-Forensic validation
-Compliance evidence
-Deterministic integrity validation


**Logging & Monitoring**

Each successful upload logs:

-User Object ID
-SHA-256 hash
-Resolution

These events are queryable in Application Insights:

customEvents
| where name == "WallpaperUpload"



**Compliance Alignment**

This architecture aligns with:

ISO 27001 secure logging controls
SOC 2 integrity and confidentiality principles
Zero Trust architecture patterns
Azure Well-Architected Framework


**Contributing**

Pull requests are welcome.

Please:

Follow secure coding practices
Avoid introducing secrets
Document any infrastructure changes



**License**

MIT License



**Philosophy**

W.A.W.E.T exists to demonstrate that:

Security, governance, and enterprise engineering discipline
can be applied to even the smallest workflows.

Because good engineering habits scale.

Also, changing wallpapers is stupid, if you don't have a great reason to do it at scale just save everybody the effort and don;t do it.  
If you absolutely do, only do it once and make it somebody else's problem. 
