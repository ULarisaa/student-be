public class Fibonacci {

    // Function to return the nth Fibonacci number
    public static int getFibonacci(int n) {
        // Handle base cases
        if (n == 0) {
            return 0;  // First Fibonacci number is 0
        } else if (n == 1) {
            return 1;  // Second Fibonacci number is 1
        }

        // Using iteration for better performance
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }

    public static void main(String[] args) {
        int n = 10; // Example, find the 10th Fibonacci number
        System.out.println("Fibonacci of " + n + " is: " + getFibonacci(n));
    }
}
