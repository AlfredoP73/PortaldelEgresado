import * as XLSX from 'xlsx';

/**
 * Export data to an Excel file.
 * @param data Array of objects to export
 * @param fileName Name of the downloaded file (without .xlsx extension)
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  
  // Escribir el archivo y forzar descarga
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Read and validate an Excel file.
 * @param file The Excel File object from an input
 * @param requiredColumns Array of column names that must exist in the file
 * @returns Promise resolving to an array of objects
 */
export const importFromExcel = (
  file: File, 
  requiredColumns: string[]
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          return reject(new Error('El archivo Excel está vacío.'));
        }

        // Obtener las claves (columnas) del primer objeto
        const fileColumns = Object.keys(jsonData[0] as object);

        // Validar columnas faltantes (case insensitive validation if needed, but exact is better)
        const missingColumns = requiredColumns.filter(
          (col) => !fileColumns.includes(col)
        );

        if (missingColumns.length > 0) {
          return reject(
            new Error(
              `Faltan columnas requeridas en el archivo: ${missingColumns.join(', ')}`
            )
          );
        }

        resolve(jsonData);
      } catch (error) {
        reject(new Error('Error procesando el archivo Excel. Asegúrese de que sea un archivo .xlsx válido.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo.'));
    };

    reader.readAsBinaryString(file);
  });
};
