#include <iostream>
#include <fstream>
#include <ctime>
using namespace std;
int main()
{
    srand(time(0));
    const int factors = 3, rows = 66;
    ifstream in("input.txt"), inElos("elos.txt");
    double** input = new double* [rows];
    for (int i = 0; i < rows; i++)
        input[i] = new double[factors];
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < factors; j++)
            in >> input[i][j];
    double* elos = new double[rows];
    for (int i = 0; i < rows; i++)
        inElos >> elos[i];
    double* weights = new double[factors];
    for (int i = 0; i < factors; i++)
        weights[i] = (double)(rand() % 9 + 1) / 10.0;

    const double eta = 0.00005;
    unsigned long long step = 0;
    double mistake = rows;
	
	//learning
    while(true) {
        double totalmis = 0;
        for (int i = 0; i < rows; i++) {
            double sum = 0;
            for (int j = 0; j < factors; j++)
                sum += input[i][j] * weights[j];
            double y = 1.0 / (1.0 + exp(-sum));
            double d = elos[i];
            double e = d - y;
            totalmis += abs(e);
            for (int j = 0; j < factors; j++)
                weights[j] += input[i][j] * eta * e;
        }
        if (mistake < totalmis) {
            cout << "step " << step << " " << "mistake" << mistake / rows << endl;
            break;
        }
        mistake = totalmis;
        step++;
        if (step % 1000 == 0)
            cout << "step " << step << " " << "mistake" << mistake / rows << endl;
    }
    cout << "weights" << endl;
    for (int i = 0; i < factors; i++)
        cout << weights[i] << " ";
    cout << endl;
	
	// using
    while (true) {
        cout << "Type 3 factors" << endl;
        double* buf = new double[factors];
        for (int i = 0; i < factors; i++) {
            cin >> buf[i];
            if (buf[i] == 999)
                goto label;
        }
        double sum = 0;
        for (int j = 0; j < factors; j++)
            sum += buf[j] * weights[j];
        double expx = exp(2 * sum);
        double y = 5000.0 / (1.0 + exp(-sum)) - 123;
        cout << y << endl;
    }
label:
    return 0;
}