public class Main {
    // Function to reverse a string
    public static String reverseString(String input) {
        String reversed = "";
        // Loop through the string in reverse order
        for (int i = input.length() - 1; i >= 0; i--) {
            reversed += input.charAt(i);
        }
        return reversed;
    }
    public static void main(String[] args) {
        String input = "hello";  // Input string
        String output = reverseString(input);  // Reverse the string
        System.out.println("Reversed String: " + output);  // Print the reversed string
    }
}
