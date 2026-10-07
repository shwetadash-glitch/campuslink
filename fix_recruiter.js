const fs = require("fs");
const path = "C:\\\\Users\\\\dashs\\\\campuselink\\\\frontend\\\\src\\\\app\\\\dashboard\\\\recruiter\\\\page.tsx";
let lines = fs.readFileSync(path, "utf8").split("\n");
let newLines = lines.slice(0, 305);

const replacement = `                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Company Size</span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 block">
                      {profile?.company?.size ? \\\`\\${profile.company.size} employees\\\` : "10,000+ employees"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Website</span>
                    {profile?.company?.website || true ? (
                      <a
                        href={profile?.company?.website || "https://www.examplecorp.com"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-blue-600 hover:underline mt-0.5 block break-all"
                      >
                        {profile?.company?.website || "https://www.examplecorp.com"} &nearr;
                      </a>
                    ) : null}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Headquarters</span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 block">
                      {profile?.company?.headquarters || "San Francisco, CA (Global HQ)"}
                    </span>
                  </div>
                </div>

                {profile?.company?.description || true ? (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs">
                    <span className="font-bold text-gray-800 block mb-1">About Company</span>
                    <p className="text-gray-600 leading-relaxed">
                      {profile?.company?.description || "We are a leading enterprise technology company building innovative software products for the future of work. Our mission is to empower professionals worldwide through cutting-edge cloud infrastructure and intelligent workflow automation."}
                    </p>
                  </div>
                ) : null}
              </Card>

              {/* Recruiter Representative info */}
              <Card
                title="Your Representative Account"
                subtitle="Authorized coordinator credentials for campus placement communications."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Designation</span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 block">
                      {profile?.designation || "Global Campus Talent Lead"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Phone</span>
                    <span className="text-sm font-semibold text-gray-900 mt-0.5 block">
                      {profile?.phone || "+1 (555) 019-2831"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 block">Recruiter ID</span>
                    <span className="text-sm font-mono font-semibold text-gray-900 mt-0.5 block">
                      REC-{profile?.id || "9283-TA"}
                    </span>
                  </div>`;

newLines.push(...replacement.split("\n"));
newLines = newLines.concat(lines.slice(365));
fs.writeFileSync(path, newLines.join("\n"));

