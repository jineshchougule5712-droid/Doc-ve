const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

// allow static files
app.use(express.static(__dirname));

// serve HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// storage config
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// upload two files
app.post(
    "/upload",
    upload.fields([
        { name: "criteriaDoc", maxCount: 1 },
        { name: "checkDoc", maxCount: 1 }
    ]),
    (req, res) => {

        const criteriaPath = req.files.criteriaDoc[0].path;
        const checkPath = req.files.checkDoc[0].path;

        const criteriaText = fs.readFileSync(criteriaPath, "utf8");
        const checkText = fs.readFileSync(checkPath, "utf8");

        const criteriaPoints = criteriaText.split("\n");
        let missing = [];

        criteriaPoints.forEach(point => {
            if (point.trim() && !checkText.includes(point.trim())) {
                missing.push(point.trim());
            }
        });

        res.send(`
            <h2>Verification Result</h2>
            ${
                missing.length === 0
                ? "<p style='color:green;font-weight:bold;'>All content is as per criteria ✅</p>"
                : `<p style="color:red;font-weight:bold;">Missing Points:</p>
                   <ul>${missing.map(m => `<li>${m}</li>`).join("")}</ul>`
            }
            <a href="/">Go Back</a>
        `);
    }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
