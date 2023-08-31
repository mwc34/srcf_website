import json
import os
import sys
import numpy as np
import itertools

PATH = os.path.dirname(__file__)

def validate_problem(numbers, target, find_shortest=False):
    solution = None
    # Loop over every pair of numbers
    for i in itertools.combinations(range(len(numbers)), 2):
        new_numbers = list(numbers)
        # Get a & b, the pair of numbers
        a = new_numbers[i[0]]
        b = new_numbers.pop(i[1])
        
        # Loop over every valid operation
        results = [a+b, abs(a-b), a*b]
        if b != 0 and a/b == a//b:
            results.append(a/b)
        if a != 0 and b/a == b//a and a != b:
            results.append(b/a)
        for idx, result in enumerate(results):
            move = [a, b, idx]
            # If reached target, we're done
            if result == target:
                return [move]
            else:
                # Replace the two numbers with result and recurse
                new_numbers[i[0]] = result
                t = validate_problem(new_numbers, target, find_shortest)
                if t:
                    if find_shortest:
                        # -1 because solution will have [move] in but t will not
                        if solution is None or len(t) < len(solution)-1:
                            solution = [move] + t
                    else:
                        return [move] + t
                        
    return solution or False
    
    
def generate_valid_problems(seed, optimal=False):
    gen = np.random.default_rng(seed)
    problems = []

    categories = [
        {
            4: [1,2,3,4,5,6,7,8,9],
            2: [10, 25],
        }, 
        {
            4: [1,2,3,4,5,6,7,8,9],
            2: [10, 15],
        },
        {
            4: [1,2,3,4,5,6,7,8,9],
            1: [11, 12, 13, 14],
            1: [15],
        },
        {
            3: [1,2,3,4,5,6,7,8,9],
            1: [11, 12, 13, 14],
            2: [15, 20],
        },
        {
            2: [1,2,3,4,5,6,7,8,9],
            2: [11, 12, 13, 14],
            2: [20, 25],
        }
    ]
    
    for idx, cat in enumerate(categories):
        target = gen.integers(50 - 49*bool(idx), 99).item() + idx*100

        numbers = []
        for key, val in cat.items():
            numbers.extend(gen.choice(val, key, False).tolist())

        if solution := validate_problem(numbers, target, optimal):
            problem = {"numbers": sorted(numbers), "target": target}
            if optimal:
                problem["optimalOperationCount"] = len(solution)
            problems.append(problem)
            break       
            
    return problems
    
if __name__ == "__main__":
    name = sys.argv[1]
    optimal = bool(int(sys.argv[2]))
    p = generate_valid_problems(list(name.encode("utf8")), optimal)
    os.makedirs(os.path.join(PATH, "starting_values"), exist_ok=True)
    with open(os.path.join(PATH, "starting_values", name + ".json"), "w") as fp:
        json.dump(p, fp)
    
