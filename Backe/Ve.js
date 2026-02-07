const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

const app = express();

// ================= STORAGE CONFIG =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// ================= SERVE HTML =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ================= TEXT EXTRACTION FUNCTION =================
async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".txt") {
        return fs.readFileSync(filePath, "utf8");
    }

    if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    if (ext === ".pdf") {
        const buffer = fs.readFileSync(filePath);
        const data = await pdf(buffer);
        return data.text;
    }

    throw new Error("Unsupported file type");
}

// ================= UPLOAD & VERIFY =================
app.post(
    "/upload",
    upload.fields([
        { name: "criteriaDoc", maxCount: 1 },
        { name: "checkDoc", maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const criteriaPath = req.files.criteriaDoc[0].path;
            const checkPath = req.files.checkDoc[0].path;

            const criteriaText = await extractText(criteriaPath);
            const checkText = await extractText(checkPath);

            const criteriaPoints = criteriaText
                .split("\n")
                .map(p => p.trim())
                .filter(Boolean);

            const checkLower = checkText.toLowerCase();

            let missing = [];

            criteriaPoints.forEach(point => {
                if (!checkLower.includes(point.toLowerCase())) {
                    missing.push(point);
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

        } catch (error) {
            res.send(`
                <p style="color:red;">Error: ${error.message}</p>
                <a href="/">Go Back</a>
            `);
        }
    }
);

// ================= SERVER START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
