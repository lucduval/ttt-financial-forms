"use server";

export async function getAccessToken() {
    const tenantId = process.env.DYNAMICS_TENANT_ID;
    const clientId = process.env.DYNAMICS_CLIENT_ID;
    const clientSecret = process.env.DYNAMICS_CLIENT_SECRET;
    const resource = process.env.DYNAMICS_RESOURCE_URL;

    if (!tenantId || !clientId || !clientSecret || !resource) {
        throw new Error("Missing Dynamics credentials in environment variables.");
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        resource: resource
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error fetching access token:", response.status, errorText);
            throw new Error(`Failed to get access token: ${response.statusText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error in getAccessToken:", error);
        throw error;
    }
}

export async function createRecord(entityCollection: string, data: Record<string, unknown>) {
    const resource = process.env.DYNAMICS_RESOURCE_URL;
    if (!resource) {
        throw new Error("Missing Dynamics resource URL.");
    }

    // Strip trailing slash if present
    const baseUrl = resource.endsWith('/') ? resource.slice(0, -1) : resource;
    const apiUrl = `${baseUrl}/api/data/v9.2/${entityCollection}`;

    try {
        const token = await getAccessToken();

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error creating record in ${entityCollection}:`, response.status, errorText);
            throw new Error(`Failed to create record: ${response.statusText} - ${errorText}`);
        }

        // If content is returned (due to Prefer header), parse it. 
        // Otherwise, just return true/success.
        if (response.headers.get("content-length") && response.headers.get("content-length") !== "0") {
            return await response.json();
        }

        return { success: true };

    } catch (error) {
        console.error("Error in createRecord:", error);
        throw error;
    }
}
