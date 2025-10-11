// Test file to validate DNA API functionality
// This can be used to test the DNA API functions independently

// Test the DNA API endpoints with any user
async function testDNAAPI(userToTest = "Craig-4574") {
  console.log("Testing DNA API functions...");
  console.log(`Testing with user: ${userToTest}`);

  try {
    // Test getDNATestsByTestTaker
    console.log(`Fetching DNA tests for ${userToTest}...`);
    const response = await fetch("https://api.wikitree.com/api.php", {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getDNATestsByTestTaker",
        key: userToTest,
      }),
    });

    const data = await response.json();
    console.log("DNA Tests Response:", data);

    if (data && data[0] && data[0].dnaTests) {
      console.log(`Found ${data[0].dnaTests.length} DNA tests for ${userToTest}`);

      // Show all DNA test types available
      const testTypes = data[0].dnaTests.map((test) => `${test.dna_name} (${test.dna_type})`);
      console.log("Available DNA test types:", testTypes);

      // Test getConnectedProfilesByDNATest with the first test
      const firstTest = data[0].dnaTests[0];
      console.log(
        `Testing connections for DNA test: ${firstTest.dna_name} (ID: ${firstTest.dna_id}, Type: ${firstTest.dna_type})`
      );

      const connectionsResponse = await fetch("https://api.wikitree.com/api.php", {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "getConnectedProfilesByDNATest",
          key: userToTest,
          dna_id: firstTest.dna_id,
        }),
      });

      const connectionsData = await connectionsResponse.json();
      console.log("DNA Connections Response:", connectionsData);

      if (connectionsData && connectionsData[0] && connectionsData[0].connections) {
        console.log(`Found ${connectionsData[0].connections.length} DNA connections for test ${firstTest.dna_name}`);
        console.log("Sample connections:", connectionsData[0].connections.slice(0, 3));

        // Show the DNA type icons that would be displayed
        console.log(`This would show the icon for ${firstTest.dna_type}:`);
        const iconMap = {
          auDNA: "icon-dna-au.svg (Autosomal DNA)",
          mtDNA: "icon-dna-mt.svg (Mitochondrial DNA)",
          yDNA: "icon-dna-y-block.svg (Y-Chromosome DNA)",
          xDNA: "icon-dna-x.svg (X-Chromosome DNA)",
        };
        console.log(`  ${iconMap[firstTest.dna_type] || firstTest.dna_type}`);
      }
    } else {
      console.log(`No DNA tests found for ${userToTest} or user may not exist.`);
    }
  } catch (error) {
    console.error("Error testing DNA API:", error);
  }
}

// Function to simulate the new flexible DNA filter feature with improved UX
function testFlexibleDNAFilter() {
  console.log("\n=== Enhanced DNA Filter with Improved UX ===");
  console.log("📝 IMPROVED BUTTON TEXT & TOOLTIPS:");
  console.log("- Button: 'DNA Test Matches with:' (clearer than 'DNA Connected to:')");
  console.log("- Comprehensive tooltip explains DNA testing vs family relationships");
  console.log("- Input placeholder: 'e.g. Smith-12345' (more helpful than 'WikiTree-ID')");
  console.log("- Input tooltip: Explains what to enter and what it finds");
  console.log("");
  console.log("🎯 BUTTON TOOLTIP EXPLAINS:");
  console.log("- Shows profiles that share DNA test results");
  console.log("- Based on actual DNA tests uploaded to WikiTree");
  console.log("- Lists test types: 23andMe, AncestryDNA, FTDNA, etc.");
  console.log("- Clarifies: NOT family tree relationships");
  console.log("- Instructions: Enter any WikiTree ID to check connections");
  console.log("");
  console.log("🔄 RESET FUNCTIONALITY:");
  console.log("1. When user changes ID in input field:");
  console.log("   - All existing DNA icons are removed");
  console.log("   - All profiles become visible (reset view)");
  console.log("   - DNA filter button becomes inactive");
  console.log("   - Ready for fresh fetch with new user ID");
  console.log("");
  console.log("💾 CACHING SYSTEM:");
  console.log("- DNA results cached per user ID");
  console.log("- Switching back to previous ID uses cached data");
  console.log("- No unnecessary API calls for already-fetched users");
  console.log("");
  console.log("🎯 USER WORKFLOW:");
  console.log("1. Enter 'Craig-4574' and click 'DNA Test Matches with:'");
  console.log("2. See DNA test matches with Craig with appropriate icons");
  console.log("3. Change input to 'Whitten-1'");
  console.log("4. View resets - all profiles visible, no DNA icons");
  console.log("5. Click 'DNA Test Matches with:' again");
  console.log("6. Fresh fetch for Whitten DNA test connections");
  console.log("7. Change back to 'Craig-4574'");
  console.log("8. Uses cached data instantly");
  console.log("");
  console.log("🧬 DNA ICON TYPES:");
  console.log("- auDNA: icon-dna-au.svg (Autosomal DNA)");
  console.log("- mtDNA: icon-dna-mt.svg (Mitochondrial DNA)");
  console.log("- yDNA: icon-dna-y-block.svg (Y-Chromosome DNA)");
  console.log("- xDNA: icon-dna-x.svg (X-Chromosome DNA)");
  console.log("");
  console.log("✨ PREVENTS CONFUSION:");
  console.log("- Clear distinction between DNA test matches and family relationships");
  console.log("- Detailed tooltips prevent misunderstanding");
  console.log("- Improved wording reduces ambiguity");
}

// Export for use in browser console
window.testDNAAPI = testDNAAPI;
window.testFlexibleDNAFilter = testFlexibleDNAFilter;

console.log("DNA API test functions loaded.");
console.log("Run testDNAAPI('WikiTree-ID') to test API with any user.");
console.log("Run testFlexibleDNAFilter() to see info about the flexible DNA filter feature.");
