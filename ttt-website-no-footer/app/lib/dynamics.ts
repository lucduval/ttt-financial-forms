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

        // With Prefer: return=representation, Dynamics returns the full entity as JSON.
        // The primary key field follows the pattern: {entityCollection without trailing 's'}id
        // e.g. new_leads -> new_leadid, annotations -> annotationid
        const body = await response.json().catch(() => null);
        console.log("Dynamics response keys:", body ? Object.keys(body).join(", ") : "no body");

        let entityId: string | null = null;
        if (body) {
            // Derive the primary key field name: strip trailing 's' and append 'id'
            const singularName = entityCollection.endsWith('s')
                ? entityCollection.slice(0, -1)
                : entityCollection;
            const primaryKeyField = `${singularName}id`;
            entityId = body[primaryKeyField] || null;

            // Fallback: search for any field ending in 'id' that looks like a GUID
            if (!entityId) {
                for (const key of Object.keys(body)) {
                    if (key.endsWith('id') && typeof body[key] === 'string' && /^[0-9a-f-]{36}$/i.test(body[key])) {
                        entityId = body[key];
                        console.log(`Found entity ID from field '${key}':`, entityId);
                        break;
                    }
                }
            }
        }

        // Fallback: try OData-EntityId header
        if (!entityId) {
            const entityIdHeader = response.headers.get("OData-EntityId");
            if (entityIdHeader) {
                const match = entityIdHeader.match(/\(([0-9a-f-]+)\)$/i);
                if (match) entityId = match[1];
            }
        }

        return { ...body, id: entityId };

    } catch (error) {
        console.error("Error in createRecord:", error);
        throw error;
    }
}

export async function updateRecord(entityCollection: string, id: string, data: Record<string, unknown>) {
    const resource = process.env.DYNAMICS_RESOURCE_URL;
    if (!resource) {
        throw new Error("Missing Dynamics resource URL.");
    }

    const baseUrl = resource.endsWith('/') ? resource.slice(0, -1) : resource;
    const apiUrl = `${baseUrl}/api/data/v9.2/${entityCollection}(${id})`;

    try {
        const token = await getAccessToken();

        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error updating record in ${entityCollection}:`, response.status, errorText);
            throw new Error(`Failed to update record: ${response.statusText} - ${errorText}`);
        }

        return { id };
    } catch (error) {
        console.error("Error in updateRecord:", error);
        throw error;
    }
}

export async function getRecords(entityCollection: string, query: string = ""): Promise<{ success: boolean; value?: any[] }> {
    const resource = process.env.DYNAMICS_RESOURCE_URL;
    if (!resource) {
        throw new Error("Missing Dynamics resource URL.");
    }

    // Strip trailing slash if present
    const baseUrl = resource.endsWith('/') ? resource.slice(0, -1) : resource;

    // Properly encode the query to avoid 502 Bad Gateway from proxies
    const encodedQuery = encodeURI(query);
    const apiUrl = `${baseUrl}/api/data/v9.2/${entityCollection}${encodedQuery}`;

    try {
        const token = await getAccessToken();

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error fetching records from ${entityCollection}:`, response.status, errorText);
            throw new Error(`Failed to fetch records: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return { success: true, value: data.value };

    } catch (error) {
        console.error("Error in getRecords:", error);
        throw error;
    }
}
