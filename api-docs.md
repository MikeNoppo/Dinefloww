# API Documentation - Menu Management

## Create New Menu Item

Menambahkan item menu baru ke dalam sistem. Endpoint ini hanya dapat diakses oleh pengguna dengan peran ADMIN.

**Endpoint:** `POST /admin/menu-item`

**Authentication:** Memerlukan Bearer Token (JWT) di header `Authorization`.

**Request Body:** `multipart/form-data`

| Field                   | Type    | Required | Description                                                                 | Example                     |
| ----------------------- | ------- | -------- | --------------------------------------------------------------------------- | --------------------------- |
| `name`                  | string  | Ya       | Nama item menu.                                                             | "Beef Burger"               |
| `category`              | string  | Ya       | Kategori item menu (misalnya, "Makanan Utama", "Minuman", "Dessert").       | "Makanan Utama"             |
| `price`                 | number  | Ya       | Harga item menu.                                                            | `12.99`                     |
| `description`           | string  | Tidak    | Deskripsi singkat item menu.                                                | "Juicy beef patty..."       |
| `availableForOrdering`  | boolean | Ya       | Status ketersediaan item menu untuk dipesan (`true` jika tersedia).         | `true`                      |
| `imageFile`             | file    | Tidak    | File gambar untuk item menu (format: jpeg, png, jpg; maks: 5MB disarankan). | (binary file data)          |

**Contoh cURL Request:**

```bash
curl -X POST \
  http://localhost:3000/admin/menu-item \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Spaghetti Carbonara" \
  -F "category=Makanan Utama" \
  -F "price=15.50" \
  -F "description=Classic Italian pasta dish" \
  -F "availableForOrdering=true" \
  -F "imageFile=@/path/to/your/image.jpg"
```

**Success Response (201 Created):**

```json
{
  "id": "clxkjq82x0000qxtc4z6h3f9a",
  "name": "Spaghetti Carbonara",
  "category": "Makanan Utama",
  "price": 15.5,
  "description": "Classic Italian pasta dish",
  "imageUrl": "/uploads/menu-images/1717056000000-spaghetti_carbonara.jpg",
  "status": "AVAILABLE",
  "createdAt": "2025-05-30T10:00:00.000Z",
  "updatedAt": "2025-05-30T10:00:00.000Z"
}
```

**Error Responses:**

*   **400 Bad Request (Validation Error):**
    Jika data yang dikirim tidak valid (misalnya, field yang wajib tidak diisi, tipe data salah).

    ```json
    {
      "statusCode": 400,
      "message": [
        "name should not be empty",
        "category should not be empty",
        "price must be a positive number",
        "availableForOrdering must be a boolean value",
        "availableForOrdering should not be empty"
      ],
      "error": "Bad Request"
    }
    ```

*   **401 Unauthorized:**
    Jika token JWT tidak valid atau tidak disertakan.

    ```json
    {
      "statusCode": 401,
      "message": "Unauthorized"
    }
    ```

*   **403 Forbidden Resource:**
    Jika pengguna yang terautentikasi tidak memiliki peran ADMIN.

    ```json
    {
      "statusCode": 403,
      "message": "Forbidden resource",
      "error": "Forbidden"
    }
    ```

*   **409 Conflict (Username already exists - contoh untuk endpoint lain, tapi relevan untuk error P2002):**
    Jika terjadi konflik data unik di database (misalnya, nama menu sudah ada jika ada constraint unik pada nama).

    ```json
    {
        "statusCode": 409,
        "message": "Menu item with this name already exists.", // Pesan error bisa disesuaikan
        "error": "Conflict"
    }
    ```
    *(Catatan: Pesan error spesifik untuk duplikasi nama menu perlu diimplementasikan di service jika belum ada)*

*   **500 Internal Server Error:**
    Jika terjadi kesalahan tak terduga di server.

    ```json
    {
      "statusCode": 500,
      "message": "Internal server error"
    }
    ```

## Get All Menu Items

Mengambil semua item menu yang ada di sistem. Endpoint ini hanya dapat diakses oleh pengguna dengan peran ADMIN.

**Endpoint:** `GET /admin/menu-items`

**Authentication:** Memerlukan Bearer Token (JWT) di header `Authorization`.

**Request Body:** Tidak ada.

**Contoh cURL Request:**

```bash
curl -X GET \
  http://localhost:3000/admin/menu-items \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success Response (200 OK):**

```json
{
  "id": "clxkjq82x0000qxtc4z6h3f9a",
  "name": "Spaghetti Carbonara",
  "category": "Makanan Utama",
  "price": 15.5,
  "description": "Classic Italian pasta dish",
  "imageUrl": "/uploads/menu-images/1717056000000-spaghetti_carbonara.jpg",
  "status": "AVAILABLE",
  "createdAt": "2025-05-30T10:00:00.000Z",
  "updatedAt": "2025-05-30T10:00:00.000Z"
},
{
  "id": "clxkjy5tr0001qxtcgh7b9e8d",
  "name": "Beef Burger",
  "category": "Makanan Utama",
  "price": 12.99,
  "description": "Juicy beef patty with lettuce, tomato, and special sauce",
  "imageUrl": "/uploads/menu-images/1717056100000-beef_burger.jpg",
  "status": "UNAVAILABLE",
  "createdAt": "2025-05-30T10:05:00.000Z",
  "updatedAt": "2025-05-30T10:15:00.000Z"
}
// ... more menu items
]
```

**Error Responses:**

*   **401 Unauthorized:**
    Jika token JWT tidak valid atau tidak disertakan.

    ```json
    {
      "statusCode": 401,
      "message": "Unauthorized"
    }
    ```

*   **403 Forbidden Resource:**
    Jika pengguna yang terautentikasi tidak memiliki peran ADMIN.

    ```json
    {
      "statusCode": 403,
      "message": "Forbidden resource",
      "error": "Forbidden"
    }
    ```

*   **500 Internal Server Error:**
    Jika terjadi kesalahan tak terduga di server.

    ```json
    {
      "statusCode": 500,
      "message": "Internal server error"
    }
    ```

## Delete Menu Item

Menghapus item menu dari sistem beserta file gambar yang terkait. Endpoint ini hanya dapat diakses oleh pengguna dengan peran ADMIN.

**Endpoint:** `DELETE /admin/menu-item/:id`

**Authentication:** Memerlukan Bearer Token (JWT) di header `Authorization`.

**Path Parameters:**

| Parameter | Type   | Required | Description                    | Example                        |
| --------- | ------ | -------- | ------------------------------ | ------------------------------ |
| `id`      | string | Ya       | ID unik dari item menu         | "clxkjq82x0000qxtc4z6h3f9a"    |

**Request Body:** Tidak ada.

**Contoh cURL Request:**

```bash
curl -X DELETE \
  http://localhost:3000/admin/menu-item/clxkjq82x0000qxtc4z6h3f9a \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success Response (200 OK):**

```json
{
  "id": "clxkjq82x0000qxtc4z6h3f9a",
  "name": "Spaghetti Carbonara",
  "category": "Makanan Utama",
  "price": 15.5,
  "description": "Classic Italian pasta dish",
  "imageUrl": "/uploads/menu-images/1717056000000-spaghetti_carbonara.jpg",
  "status": "AVAILABLE",
  "createdAt": "2025-05-30T10:00:00.000Z",
  "updatedAt": "2025-05-30T10:00:00.000Z"
}
```

**Fitur Khusus:**
- **Penghapusan File Gambar Otomatis**: Sistem akan secara otomatis menghapus file gambar yang terkait dengan item menu dari direktori server
- **Validasi Keamanan**: Memastikan hanya file dalam direktori yang benar yang dapat dihapus
- **Error Recovery**: Jika penghapusan file gambar gagal, penghapusan data dari database tetap dilanjutkan
- **Logging Komprehensif**: Semua operasi dicatat untuk monitoring dan debugging

**Error Responses:**

*   **400 Bad Request (Invalid ID):**
    Jika ID yang diberikan tidak valid (kosong, null, atau format salah).

    ```json
    {
      "statusCode": 400,
      "message": "Invalid menu item ID provided.",
      "error": "Bad Request"
    }
    ```

*   **401 Unauthorized:**
    Jika token JWT tidak valid atau tidak disertakan.

    ```json
    {
      "statusCode": 401,
      "message": "Unauthorized"
    }
    ```

*   **403 Forbidden Resource:**
    Jika pengguna yang terautentikasi tidak memiliki peran ADMIN.

    ```json
    {
      "statusCode": 403,
      "message": "Forbidden resource",
      "error": "Forbidden"
    }
    ```

*   **404 Not Found:**
    Jika item menu dengan ID tersebut tidak ditemukan.

    ```json
    {
      "statusCode": 404,
      "message": "Menu item with ID clxkjq82x0000qxtc4z6h3f9a not found.",
      "error": "Not Found"
    }
    ```

*   **409 Conflict (Foreign Key Constraint):**
    Jika item menu tidak dapat dihapus karena masih direferensikan oleh pesanan yang ada.

    ```json
    {
      "statusCode": 409,
      "message": "Cannot delete menu item as it is referenced by existing orders. Please contact administrator.",
      "error": "Conflict"
    }
    ```

*   **500 Internal Server Error (Database Connection):**
    Jika terjadi masalah koneksi database.

    ```json
    {
      "statusCode": 500,
      "message": "Database connection failed. Please try again later.",
      "error": "Internal Server Error"
    }
    ```

*   **500 Internal Server Error (Transaction Conflict):**
    Jika terjadi konflik transaksi database.

    ```json
    {
      "statusCode": 500,
      "message": "Transaction conflict occurred. Please try again.",
      "error": "Internal Server Error"
    }
    ```

*   **500 Internal Server Error (Generic):**
    Jika terjadi kesalahan tak terduga lainnya.

    ```json
    {
      "statusCode": 500,
      "message": "An unexpected error occurred while deleting the menu item. Please try again or contact support.",
      "error": "Internal Server Error"
    }
    ```

**Catatan Penting:**

1. **Penghapusan Permanen**: Operasi ini akan menghapus item menu secara permanen dari database dan tidak dapat dibatalkan.

2. **Penghapusan File Gambar**: File gambar yang terkait akan dihapus dari server. Jika penghapusan file gagal (misalnya file sudah tidak ada), operasi database tetap akan dilanjutkan.

3. **Keamanan File**: Sistem memiliki validasi keamanan untuk memastikan hanya file dalam direktori `public/uploads/menu-images/` yang dapat dihapus.

4. **Referensi Pesanan**: Jika item menu masih direferensikan oleh pesanan yang ada, penghapusan akan ditolak dengan error 409 Conflict.

5. **Logging**: Semua operasi penghapusan dicatat dalam log server untuk audit dan debugging.

**Contoh Implementasi di Frontend (JavaScript):**

```javascript
async function deleteMenuItem(menuItemId, authToken) {
  try {
    const response = await fetch(`/admin/menu-item/${menuItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete menu item');
    }

    const deletedMenuItem = await response.json();
    console.log('Menu item deleted successfully:', deletedMenuItem);
    
    // Update UI or redirect as needed
    return deletedMenuItem;
    
  } catch (error) {
    console.error('Error deleting menu item:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('referenced by existing orders')) {
      alert('Cannot delete menu item: it is still referenced by existing orders.');
    } else if (error.message.includes('not found')) {
      alert('Menu item not found. It may have already been deleted.');
    } else {
      alert('Failed to delete menu item. Please try again.');
    }
    
    throw error;
  }
}

// Usage example
deleteMenuItem('clxkjq82x0000qxtc4z6h3f9a', 'your-jwt-token-here')
  .then(deletedItem => {
    // Handle success
    window.location.reload(); // or update the UI dynamically
  })
  .catch(error => {
    // Error already handled in the function
  });
```

**Contoh Testing dengan Jest/Supertest:**

```javascript
describe('DELETE /admin/menu-item/:id', () => {
  it('should delete menu item successfully', async () => {
    const response = await request(app)
      .delete('/admin/menu-item/valid-menu-item-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
  });

  it('should return 404 for non-existent menu item', async () => {
    const response = await request(app)
      .delete('/admin/menu-item/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body.message).toContain('not found');
  });

  it('should return 401 without authentication', async () => {
    await request(app)
      .delete('/admin/menu-item/valid-id')
      .expect(401);
  });

  it('should return 403 for non-admin users', async () => {
    await request(app)
      .delete('/admin/menu-item/valid-id')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
```
