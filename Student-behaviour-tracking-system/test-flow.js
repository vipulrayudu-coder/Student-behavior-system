const jwt = require('jsonwebtoken');

async function runTest() {
    console.log("--- Starting End-to-End API Flow Test ---");

    const baseUrl = 'http://localhost:3000/api';

    // 1. Login as Admin
    console.log("1. Logging in as Admin (klhAdmin@gmail.com)...");
    let adminRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'klhAdmin@gmail.com', password: 'Admin@123' })
    });
    let adminData = await adminRes.json();
    if (!adminRes.ok) {
        console.error("Admin login failed:", adminData);
        return;
    }
    const adminToken = adminData.token;
    console.log("   ✅ Admin login successful.");

    // 2. Create Incident
    console.log("\n2. Creating Incident Report for Student ST-1001...");
    let incidentData = {
        studentId: 'ST-1001',
        studentName: 'Student',
        grade: '10',
        type: 'Behavioral',
        severity: 'Medium',
        location: 'Cafeteria',
        description: 'Test incident from API verification script',
        date: new Date().toISOString()
    };

    let createRes = await fetch(`${baseUrl}/incidents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(incidentData)
    });
    let createdIncident = await createRes.json();
    if (!createRes.ok) {
        console.error("Create incident failed:", createdIncident);
        return;
    }
    console.log(`   ✅ Incident created successfully. ID: ${createdIncident.id}`);

    // 3. Admin Check History
    console.log("\n3. Verifying Incident in Admin History...");
    let historyRes = await fetch(`${baseUrl}/incidents`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    let historyData = await historyRes.json();
    let found = historyData.find(i => i.id === createdIncident.id);
    if (found) {
        console.log("   ✅ Incident found in Admin History.");
    } else {
        console.error("   ❌ Incident NOT found in Admin History!");
    }

    // 4. Login as Student
    console.log("\n4. Logging in as Student (Student@gmail.com)...");
    let studentRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'Student@gmail.com', password: 'Student@123' })
    });
    let studentData = await studentRes.json();
    if (!studentRes.ok) {
        console.error("Student login failed:", studentData);
        return;
    }
    const studentToken = studentData.token;
    console.log(`   ✅ Student login successful. Student ID: ${studentData.user.studentId}`);

    // 5. Student Check Portal
    console.log("\n5. Verifying Incident in Student Portal...");
    let studentHistoryRes = await fetch(`${baseUrl}/incidents`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    let studentHistoryData = await studentHistoryRes.json();
    let studentFound = studentHistoryData.find(i => i.id === createdIncident.id);
    if (studentFound) {
        console.log("   ✅ Incident successfully propagated to Student Portal.");
    } else {
        console.error("   ❌ Incident NOT found in Student Portal!");
    }

    console.log("\n--- Test Complete ---");
}

runTest();
