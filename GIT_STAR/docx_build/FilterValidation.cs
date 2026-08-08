using System;
using System.Linq;
using DocumentFormat.OpenXml.Validation;
using DocumentFormat.OpenXml.Packaging;

namespace DocxValidator
{
    class Program
    {
        static void Main()
        {
            string docPath = @"..\Spatial_Autocorrelation_Assignment.docx";
            Console.WriteLine($"Validating document: {docPath}");
            try
            {
                using (var doc = WordprocessingDocument.Open(docPath, false))
                {
                    var validator = new OpenXmlValidator();
                    int count = 0;
                    int filteredCount = 0;
                    foreach (var error in validator.Validate(doc))
                    {
                        count++;
                        string desc = error.Description;
                        // Filter out common style/run property order warnings to find structural issues
                        bool isCommonOrderWarning = desc.Contains("spacing") || 
                                                    desc.Contains("color") || 
                                                    desc.Contains("font") || 
                                                    desc.Contains(":b") || 
                                                    desc.Contains(":i") || 
                                                    desc.Contains(":sz") ||
                                                    desc.Contains("rFonts") ||
                                                    desc.Contains("jc") ||
                                                    desc.Contains("pStyle");
                        
                        if (!isCommonOrderWarning)
                        {
                            filteredCount++;
                            Console.WriteLine($"Error {count} (Filtered #{filteredCount}):");
                            Console.WriteLine($" - Description: {desc}");
                            Console.WriteLine($" - Path: {error.Path?.XPath}");
                            Console.WriteLine($" - Part: {error.Part?.Uri}");
                        }
                    }
                    Console.WriteLine($"Validation complete. Found {count} total errors, {filteredCount} structural errors.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception during validation: {ex.Message}");
            }
        }
    }
}
