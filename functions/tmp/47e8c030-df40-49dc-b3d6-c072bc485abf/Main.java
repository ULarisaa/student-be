import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        int[] numbers={20,30,40,50,60,70,80};
        for (int num : numbers){
            System.out.rpintln(num+" ");
        }
         scanner.close();
    }
}