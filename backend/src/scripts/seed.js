// DEMO DATA ONLY - for local demonstrations. Do not run against production.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Institution = require("../models/Institution");
const FDR = require("../models/FDR");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const { addMonths, todayIST } = require("../utils/fdrCalc");

const DEMO_OFFICER = {
  email: "officer@aicte-demo.gov.in",
  password: "Officer@12345",
};
const DEMO_INST_PASSWORD = "Demo@12345";
const insts = [
  {
    name: "Global Tech Institute",
    code: "GTI-001",
    email: "admin@globaltech.edu.in",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110085",
    address: "Sector 16, Rohini",
    latitude: 28.7041,
    longitude: 77.1025,
  },
  {
    name: "Sunrise Institute of Engineering",
    code: "SIE-002",
    email: "admin@sunrise.edu.in",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    address: "Baner Road",
    latitude: 18.5204,
    longitude: 73.8567,
  },
  {
    name: "Lakeview College of Technology",
    code: "LCT-003",
    email: "admin@lakeview.edu.in",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    address: "MG Road",
    latitude: 12.9716,
    longitude: 77.5946,
  },
];
// [inst, bank, branch, principal, rate, tenure, monthsAgoIssued, payout, status, daysAgoSubmitted]
const rows = [
  [
    0,
    "Punjab National Bank",
    "Rohini, Delhi",
    500000,
    6.25,
    12,
    10.3,
    "QUARTERLY",
    "APPROVED",
    40,
  ],
  [
    0,
    "State Bank of India",
    "Connaught Place, Delhi",
    1200000,
    7.0,
    24,
    6,
    "CUMULATIVE",
    "APPROVED",
    28,
  ],
  [
    0,
    "HDFC Bank",
    "Rohini, Delhi",
    750000,
    6.75,
    18,
    1,
    "MONTHLY",
    "PENDING_REVIEW",
    2,
  ],
  [
    0,
    "Canara Bank",
    "Pitampura, Delhi",
    300000,
    6.5,
    12,
    0.5,
    "CUMULATIVE",
    "REJECTED",
    6,
  ],
  [
    1,
    "Bank of Baroda",
    "Baner, Pune",
    2000000,
    7.1,
    36,
    13,
    "HALF_YEARLY",
    "APPROVED",
    24,
  ],
  [
    1,
    "State Bank of India",
    "FC Road, Pune",
    850000,
    6.8,
    12,
    15,
    "CUMULATIVE",
    "APPROVED",
    20,
  ],
  [
    1,
    "ICICI Bank",
    "Shivajinagar, Pune",
    400000,
    6.6,
    12,
    0.3,
    "QUARTERLY",
    "PENDING_REVIEW",
    1,
  ],
  [
    2,
    "Punjab National Bank",
    "MG Road, Bengaluru",
    1500000,
    6.9,
    24,
    3,
    "CUMULATIVE",
    "APPROVED",
    14,
  ],
  [
    2,
    "Canara Bank",
    "Indiranagar, Bengaluru",
    600000,
    6.5,
    12,
    0.4,
    "ANNUAL",
    "PENDING_REVIEW",
    3,
  ],
  [
    2,
    "HDFC Bank",
    "Whitefield, Bengaluru",
    950000,
    7.0,
    15,
    2,
    "QUARTERLY",
    "APPROVED",
    9,
  ],
];
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  if (await User.exists({ email: DEMO_OFFICER.email })) {
    console.log("Demo data already present. Drop the database to re-seed.");
    return mongoose.disconnect();
  }
  const today = todayIST();
  const officer = await User.create({
    name: "Demo AICTE Officer",
    email: DEMO_OFFICER.email,
    role: "AICTE_OFFICER",
    passwordHash: await bcrypt.hash(DEMO_OFFICER.password, 12),
  });
  const instDocs = [],
    users = [];
  for (const i of insts) {
    const inst = await Institution.create(i);
    instDocs.push(inst);
    users.push(
      await User.create({
        name: i.name,
        email: i.email,
        role: "INSTITUTION",
        institution: inst._id,
        passwordHash: await bcrypt.hash(DEMO_INST_PASSWORD, 12),
      }),
    );
  }
  let n = 0;
  for (const [
    ii,
    bank,
    branch,
    principal,
    rate,
    tenure,
    mAgo,
    payout,
    status,
    dAgo,
  ] of rows) {
    n++;
    const whole = Math.floor(mAgo);
    const issue = new Date(
      addMonths(today, -whole).getTime() -
        Math.round((mAgo - whole) * 30) * 864e5,
    );
    const submittedAt = new Date(Date.now() - dAgo * 864e5);
    const fdr = await FDR.create({
      institution: instDocs[ii]._id,
      submittedBy: users[ii]._id,
      fdrNumber: `DEMO-${bank
        .split(" ")
        .map((w) => w[0])
        .join("")}-00${1000 + n}`,
      receiptNumber: String(672340 + n),
      bankName: bank,
      bankBranch: branch,
      depositorName: insts[ii].name,
      customerId: `C98765${4300 + n}`,
      accountNumber: String(190012345670 + n),
      principal,
      interestRate: rate,
      tenureMonths: tenure,
      issueDate: issue,
      maturityDate: addMonths(issue, tenure),
      payoutFrequency: payout,
      status,
      version: 1,
      submittedAt,
      createdAt: submittedAt,
      events: [
        { type: "SUBMITTED", version: 1, at: submittedAt, by: users[ii]._id },
      ],
      ...(status !== "PENDING_REVIEW"
        ? {
            reviewedBy: officer._id,
            reviewedAt: new Date(submittedAt.getTime() + 864e5),
            rejectionReason:
              status === "REJECTED"
                ? "Scanned receipt is blurred and the account number is not readable. Please upload a clear copy."
                : undefined,
          }
        : {}),
    });
    if (status !== "PENDING_REVIEW")
      await Review.create({
        fdr: fdr._id,
        officer: officer._id,
        version: 1,
        decision: status,
        reviewedAt: fdr.reviewedAt,
        remarks:
          status === "REJECTED"
            ? fdr.rejectionReason
            : "Verified against bank receipt.",
      });
    if (status === "PENDING_REVIEW")
      await Notification.create({
        recipient: officer._id,
        fdr: fdr._id,
        type: "FDR_SUBMITTED",
        title: "New FDR submitted",
        message: `${insts[ii].name} submitted FDR ${fdr.fdrNumber} for review.`,
      });
    if (status === "REJECTED")
      await Notification.create({
        recipient: users[ii]._id,
        fdr: fdr._id,
        type: "FDR_REJECTED",
        title: "FDR rejected - action required",
        message: `Your FDR ${fdr.fdrNumber} was rejected. Reason: ${fdr.rejectionReason}`,
      });
    if (status === "APPROVED")
      await Notification.create({
        recipient: users[ii]._id,
        fdr: fdr._id,
        type: "FDR_APPROVED",
        title: "FDR approved",
        message: `Your FDR ${fdr.fdrNumber} has been approved.`,
      });
  }
  console.log("DEMO data created (no documents attached to seeded FDRs).");
  console.log(`Officer:      ${DEMO_OFFICER.email} / ${DEMO_OFFICER.password}`);
  console.log(
    `Institutions: ${insts.map((i) => i.email).join(", ")} / ${DEMO_INST_PASSWORD}`,
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
