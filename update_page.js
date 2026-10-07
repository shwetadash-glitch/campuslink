const fs = require("fs");
const path = "C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\recruiter\\page.tsx";
let c = fs.readFileSync(path, "utf8");
c = c.replace(
  `onSuccess={() => {\n          showToast("Company profile updated.");\n          fetchData();\n        }}`,
  `onSuccess={(updatedData: any) => {\n          showToast("Company profile updated.");\n          if (updatedData && profile) {\n            setProfile({ ...profile, company: { ...profile.company, ...updatedData } });\n          } else {\n            fetchData();\n          }\n        }}`
);
c = c.replace(
  `onSuccess={() => {\r\n          showToast("Company profile updated.");\r\n          fetchData();\r\n        }}`,
  `onSuccess={(updatedData: any) => {\r\n          showToast("Company profile updated.");\r\n          if (updatedData && profile) {\r\n            setProfile({ ...profile, company: { ...profile.company, ...updatedData } });\r\n          } else {\r\n            fetchData();\r\n          }\r\n        }}`
);
fs.writeFileSync(path, c);
