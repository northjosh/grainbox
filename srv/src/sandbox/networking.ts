import { ADMIN_LISTEN_ADDR, ADMIN_SECRET } from "../constants.js";

export async function getPorts() {
  try {
    const res = await fetch(`http://${ADMIN_LISTEN_ADDR}/sandboxes/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET} `,
      },
    });

    if (!res.ok) {
      // throw some error
    }
    return await res.json();
  } catch {
    console.log("error fetching port mappings");
  }
}

export async function setPort(id: string) {
  try {
    const res = await fetch(`http://${ADMIN_LISTEN_ADDR}/sandboxes/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
    });

    if (!res.ok) {
      // throw some error
      console.log(res);
    }
    const response = await res.json();
    console.log(response);
    return response;
  } catch (e) {
    console.log(e);
  }
}

export async function registerRoute(
  id: string,
  hostPort: string | number,
  guestPort: string | number,
) {
  try {
    const res = await fetch(`http://${ADMIN_LISTEN_ADDR}/register/${encodeURIComponent(hostPort)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ guestPort, id }),
    });

    if (!res.ok) {
      // throw some error
      console.log(res);
    }
    const response = await res.json();
    console.log(response);
    return response;
  } catch (e) {
    console.log(e);
  }
}

export async function deregisterRoute(id: string) {
  try {
    const res = await fetch(`http://${ADMIN_LISTEN_ADDR}/register/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
    });

    if (!res.ok) {
      // throw some error
      console.log(res);
    }
    const response = await res.json();
    console.log(response);
    return response;
  } catch (e) {
    console.log(e);
  }
}

export async function releasePort(port: number) {
  try {
    const res = await fetch(`http://${ADMIN_LISTEN_ADDR}/sandboxes/${encodeURIComponent(port)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET} `,
      },
    });

    if (!res.ok) {
      console.log(res);
    }
    return;
  } catch (e) {
    console.log(e);
  }
}
