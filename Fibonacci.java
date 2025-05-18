import java.util.Scanner;

public class Fibonacci {

    public static int getFibonacci(int n) {
        if (n == 0) return 0;
        if (n == 1) return 1;

        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int next = a + b;
            a = b;
            b = next;
        }

        return b;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter a non-negative integer n: ");
        int n = scanner.nextInt();

        if (n < 0) {
            System.out.println("n must be non-negative.");
        } else {
            int result = getFibonacci(n);
            System.out.println("Fibonacci(" + n + ") = " + result);
        }

        scanner.close();
    }
}
