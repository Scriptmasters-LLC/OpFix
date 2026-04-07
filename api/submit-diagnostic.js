module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GHL_TOKEN       = process.env.GHL_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_WORKFLOW_ID = process.env.GHL_WORKFLOW_ID;

  if (!GHL_TOKEN || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { firstName, lastName, email, phone, companyName, customFields } = req.body;

  const payload = {
    locationId:  GHL_LOCATION_ID,
    firstName,
    lastName,
    email,
    phone,
    companyName,
    customFields: customFields || []
  };

  // Upsert contact
  const upsertRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GHL_TOKEN,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    },
    body: JSON.stringify(payload)
  });

  if (!upsertRes.ok) {
    const err = await upsertRes.json().catch(() => ({}));
    return res.status(upsertRes.status).json({ error: err.message || 'GHL upsert failed' });
  }

  const upsertData = await upsertRes.json();
  const contactId = upsertData && upsertData.contact && upsertData.contact.id;

  // Enroll in workflow (non-blocking — don't fail if this errors)
  if (contactId && GHL_WORKFLOW_ID) {
    await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/workflow/' + GHL_WORKFLOW_ID, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_TOKEN,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    }).catch(function() {});
  }

  return res.status(200).json({ success: true });
};
